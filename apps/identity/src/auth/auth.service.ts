import { Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import type { User } from "@wfh/contracts";
import { createHash, randomBytes } from "node:crypto";
import { DataSource, MoreThan, Repository } from "typeorm";
import { identityConfig } from "../config/configuration";
import { Employee } from "../employees/employee.entity";
import { publicEmployee } from "../employees/employee.presenter";
import { LoginDto } from "./dto/login.dto";
import { verifyPassword } from "./password";
import { Session } from "./session.entity";

const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");

@Injectable()
export class AuthService {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
  ) {}

  async authenticate(token: unknown): Promise<User> {
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
      throw new UnauthorizedException("Please sign in to continue.");
    }
    const session = await this.sessions.findOneBy({
      tokenHash: tokenHash(token),
      expiresAt: MoreThan(new Date()),
    });
    const user =
      session &&
      (await this.employees.findOneBy({
        id: session.employeeId,
        active: true,
      }));
    if (!user) {
      throw new UnauthorizedException(
        "Your session has expired or your account is inactive. Please sign in again.",
      );
    }

    return publicEmployee(user);
  }

  async login(input: LoginDto) {
    const user = await this.employees
      .createQueryBuilder("e")
      .addSelect("e.passwordHash")
      .where("e.email = :email", { email: input.email })
      .getOne();
    // Run the same expensive hash for unknown accounts to avoid a cheap email-enumeration signal.
    const dummy = "00000000000000000000000000000000:" + "0".repeat(128);
    const valid = await verifyPassword(
      input.password,
      user?.passwordHash || dummy,
    );
    if (!user || !valid || !user.active) {
      throw new UnauthorizedException(
        "Email or password is incorrect, or the account is inactive.",
      );
    }
    const token = randomBytes(32).toString("hex");
    await this.db.transaction(async (manager) => {
      const current = await manager.getRepository(Employee).findOne({
        where: { id: user.id },
        select: { id: true, active: true, passwordHash: true },
        lock: { mode: "pessimistic_write" },
      });
      if (!current?.active || current.passwordHash !== user.passwordHash) {
        throw new UnauthorizedException(
          "Your account changed. Please sign in again.",
        );
      }
      await manager.getRepository(Session).save({
        tokenHash: tokenHash(token),
        employeeId: user.id,
        expiresAt: new Date(Date.now() + identityConfig.sessionLifetimeMs),
      });
      await manager.query(
        "DELETE FROM sessions WHERE expiresAt <= UTC_TIMESTAMP(3)",
      );
    });

    return { token, user: publicEmployee(user) };
  }

  async logout(token: unknown) {
    if (typeof token === "string") {
      await this.sessions.delete({ tokenHash: tokenHash(token) });
    }
  }
}
