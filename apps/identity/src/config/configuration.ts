import { httpConfig, port, url } from "@wfh/common";

export const identityConfig = {
  port: port("IDENTITY_PORT", 3001),
  databaseUrl: url(
    "IDENTITY_DATABASE_URL",
    "mysql://identity:identity_local@127.0.0.1:3307/identity_db",
    ["mysql:"],
  ),
  cookie: {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: httpConfig.secureCookie,
    path: "/",
  },
  sessionLifetimeMs: 12 * 60 * 60 * 1000,
};
