import { Module } from "@nestjs/common";
import { RolesGuard } from "@wfh/common";
import { IdentityClient } from "./identity-client.service";
import { IdentityGuard } from "./identity.guard";

@Module({
  providers: [IdentityClient, IdentityGuard, RolesGuard],
  exports: [IdentityClient, IdentityGuard, RolesGuard],
})
export class IdentityClientModule {}
