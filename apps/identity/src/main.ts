import { Logger } from "@nestjs/common";
import { bootstrap } from "@wfh/common";
import { AppModule } from "./app.module";
import { identityConfig } from "./config/configuration";

bootstrap(
  AppModule,
  "WFH Identity API",
  identityConfig.port,
  "api/identity/docs",
).catch((error: Error) => {
  new Logger("Bootstrap").error(error.stack);
  process.exitCode = 1;
});
