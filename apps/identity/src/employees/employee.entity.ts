import type { User } from "@wfh/contracts";
import { Column, Entity, Index, PrimaryColumn } from "typeorm";

@Entity("employees")
export class Employee implements User {
  @PrimaryColumn({ type: "char", length: 36 })
  id!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 24 })
  employeeCode!: string;

  @Column({ type: "varchar", length: 100 })
  fullName!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 254 })
  email!: string;

  @Column({ type: "varchar", length: 80 })
  department!: string;

  @Column({ type: "varchar", length: 80 })
  jobTitle!: string;

  @Column({ type: "varchar", length: 256, select: false })
  passwordHash!: string;

  @Column({ type: "enum", enum: ["HR", "EMPLOYEE"], default: "EMPLOYEE" })
  role!: User["role"];

  @Column({ type: "boolean", default: true })
  active!: boolean;

  @Column({ type: "datetime", precision: 3 })
  createdAt!: Date;

  @Column({ type: "datetime", precision: 3 })
  updatedAt!: Date;
}
