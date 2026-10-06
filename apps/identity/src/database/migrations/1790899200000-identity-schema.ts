import { MigrationInterface, QueryRunner } from "typeorm";

export class IdentitySchema1790899200000 implements MigrationInterface {
  async up(queryRunner: QueryRunner) {
    await queryRunner.query(`CREATE TABLE employees (
      id CHAR(36) PRIMARY KEY, employeeCode VARCHAR(24) NOT NULL UNIQUE,
      fullName VARCHAR(100) NOT NULL, email VARCHAR(254) NOT NULL UNIQUE,
      department VARCHAR(80) NOT NULL, jobTitle VARCHAR(80) NOT NULL,
      passwordHash VARCHAR(256) NOT NULL, role ENUM('HR','EMPLOYEE') NOT NULL DEFAULT 'EMPLOYEE',
      active BOOLEAN NOT NULL DEFAULT TRUE, createdAt DATETIME(3) NOT NULL, updatedAt DATETIME(3) NOT NULL,
      INDEX idx_employee_active (active)
    ) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE sessions (
      tokenHash CHAR(64) PRIMARY KEY, employeeId CHAR(36) NOT NULL, expiresAt DATETIME(3) NOT NULL,
      INDEX idx_session_employee (employeeId), INDEX idx_session_expiry (expiresAt),
      CONSTRAINT fk_session_employee FOREIGN KEY (employeeId) REFERENCES employees(id)
    ) ENGINE=InnoDB`);
  }

  async down(queryRunner: QueryRunner) {
    await queryRunner.query("DROP TABLE sessions");
    await queryRunner.query("DROP TABLE employees");
  }
}
