import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { AuthRequest } from "@wfh/common";
import { SESSION_COOKIE } from "@wfh/contracts";
import { IdentityClient } from "./identity-client.service";

@Injectable()
export class IdentityGuard implements CanActivate {
  constructor(private readonly identity: IdentityClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    request.user = await this.identity.authenticate(
      request.cookies?.[SESSION_COOKIE],
    );

    return true;
  }
}
