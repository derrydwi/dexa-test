import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { AuthRequest } from "@wfh/common";
import { SESSION_COOKIE } from "@wfh/contracts";
import { AuthService } from "./auth.service";

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    request.user = await this.auth.authenticate(
      request.cookies?.[SESSION_COOKIE],
    );

    return true;
  }
}
