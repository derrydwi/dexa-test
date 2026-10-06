import "reflect-metadata";
import { DataSource } from "typeorm";
import { Session } from "../auth/session.entity";
import { identityConfig } from "../config/configuration";
import { Employee } from "../employees/employee.entity";
import { IdentitySchema1790899200000 } from "./migrations/1790899200000-identity-schema";

export const databaseOptions = {
  type: "mysql" as const,
  url: identityConfig.databaseUrl,
  timezone: "Z",
  charset: "utf8mb4",
  entities: [Employee, Session],
  migrations: [IdentitySchema1790899200000],
  synchronize: false,
};

export const database = new DataSource(databaseOptions);
