import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import type { Page, User } from "@wfh/contracts";
import { randomUUID } from "node:crypto";
import { DataSource, Repository } from "typeorm";
import { hashPassword } from "../auth/password";
import { Session } from "../auth/session.entity";
import {
  CreateEmployeeDto,
  EmployeeQuery,
  UpdateEmployeeDto,
} from "./dto/employee.dto";
import { Employee } from "./employee.entity";
import { publicEmployee } from "./employee.presenter";

@Injectable()
export class EmployeesService {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
  ) {}

  async list(query: EmployeeQuery): Promise<Page<User>> {
    const builder = this.employees
      .createQueryBuilder("e")
      .where("e.role = :role", { role: "EMPLOYEE" });
    if (query.status !== "all") {
      builder.andWhere("e.active = :active", {
        active: query.status === "active",
      });
    }
    if (query.q) {
      builder.andWhere(
        "(LOCATE(:q, e.fullName) > 0 OR LOCATE(:q, e.email) > 0 OR LOCATE(:q, e.employeeCode) > 0 OR LOCATE(:q, e.department) > 0)",
        { q: query.q },
      );
    }
    const [items, total] = await builder
      .orderBy("e.createdAt", "DESC")
      .addOrderBy("e.id", "ASC")
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();

    return {
      items: items.map(publicEmployee),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async employee(id: string) {
    const employee = await this.employees.findOneBy({ id, role: "EMPLOYEE" });
    if (!employee) {
      throw new NotFoundException("Employee not found.");
    }

    return publicEmployee(employee);
  }

  async create(input: CreateEmployeeDto) {
    const { password, ...fields } = input;
    try {
      const employee = await this.employees.save({
        ...fields,
        id: randomUUID(),
        employeeCode: input.employeeCode.toUpperCase(),
        role: "EMPLOYEE" as const,
        passwordHash: await hashPassword(password),
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return publicEmployee(employee);
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async update(id: string, input: UpdateEmployeeDto) {
    if (!Object.keys(input).length) {
      throw new BadRequestException("Provide at least one field to update.");
    }
    const { password, status, ...fields } = input;
    try {
      return await this.db.transaction(async (manager) => {
        const employees = manager.getRepository(Employee);
        const employee = await employees.findOne({
          where: { id },
          lock: { mode: "pessimistic_write" },
        });
        if (!employee) {
          throw new NotFoundException("Employee not found.");
        }
        if (employee.role === "HR") {
          throw new ForbiddenException(
            "HR accounts cannot be edited through employee management.",
          );
        }
        Object.assign(employee, fields, {
          ...(input.employeeCode
            ? { employeeCode: input.employeeCode.toUpperCase() }
            : {}),
          ...(status ? { active: status === "active" } : {}),
          ...(password ? { passwordHash: await hashPassword(password) } : {}),
          updatedAt: new Date(),
        });
        await employees.save(employee);
        if (password || status === "inactive") {
          await manager.getRepository(Session).delete({ employeeId: id });
        }

        return publicEmployee(employee);
      });
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  private rethrowConflict(error: unknown): never {
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
      throw new ConflictException(
        "Employee code or email is already in use, including inactive accounts.",
      );
    }
    throw error;
  }
}
