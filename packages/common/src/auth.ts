import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  createParamDecorator,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { User } from "@wfh/contracts";
import type { Request } from "express";

export type AuthRequest = Request & { user: User };

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User =>
    context.switchToHttp().getRequest<AuthRequest>().user,
);

export const Roles = (...roles: User["role"][]) => SetMetadata("roles", roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<User["role"][]>("roles", [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles) {
      return true;
    }
    if (
      !roles.includes(
        context.switchToHttp().getRequest<AuthRequest>().user?.role,
      )
    ) {
      throw new ForbiddenException(
        "This action is not available for your role.",
      );
    }

    return true;
  }
}
