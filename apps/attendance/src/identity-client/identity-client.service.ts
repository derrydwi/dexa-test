import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { SESSION_COOKIE, User } from "@wfh/contracts";
import { attendanceConfig } from "../config/configuration";

@Injectable()
export class IdentityClient {
  async authenticate(token: unknown): Promise<User> {
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
      throw new UnauthorizedException("Please sign in to continue.");
    }
    try {
      const response = await fetch(
        `${attendanceConfig.identityUrl}/api/auth/me`,
        {
          headers: { Cookie: `${SESSION_COOKIE}=${token}` },
          signal: AbortSignal.timeout(attendanceConfig.identityTimeoutMs),
        },
      );
      if (response.status === 401) {
        throw new UnauthorizedException(
          "Your session has expired or your account is inactive. Please sign in again.",
        );
      }
      if (!response.ok) {
        throw new Error("Identity request failed");
      }
      const body: unknown = await response.json();
      if (!this.isUser(body)) {
        throw new Error("Invalid identity response");
      }
      if (!body.active) {
        throw new UnauthorizedException(
          "Your account is inactive. Please sign in again.",
        );
      }

      return body;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new ServiceUnavailableException(
        "Identity service is temporarily unavailable. Please try again.",
      );
    }
  }

  private isUser(value: unknown): value is User {
    if (!value || typeof value !== "object") {
      return false;
    }
    const user = value as Record<string, unknown>;

    return (
      typeof user.id === "string" &&
      /^[a-f0-9-]{36}$/i.test(user.id) &&
      ["employeeCode", "fullName", "email", "department", "jobTitle"].every(
        (key) => typeof user[key] === "string",
      ) &&
      (user.role === "HR" || user.role === "EMPLOYEE") &&
      typeof user.active === "boolean"
    );
  }
}
