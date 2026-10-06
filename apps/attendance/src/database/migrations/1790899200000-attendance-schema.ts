import { MigrationInterface, QueryRunner } from "typeorm";

export class AttendanceSchema1790899200000 implements MigrationInterface {
  async up(queryRunner: QueryRunner) {
    await queryRunner.query(`CREATE TABLE attendance (
      id CHAR(36) PRIMARY KEY, employeeId CHAR(36) NOT NULL, employeeCode VARCHAR(24) NOT NULL,
      fullName VARCHAR(100) NOT NULL, department VARCHAR(80) NOT NULL, workDate DATE NOT NULL,
      checkInAt DATETIME(3) NOT NULL, checkOutAt DATETIME(3) NULL,
      checkInPhoto VARCHAR(64) NOT NULL, checkOutPhoto VARCHAR(64) NULL,
      UNIQUE KEY uq_attendance_employee_date (employeeId, workDate),
      INDEX idx_attendance_date (workDate), INDEX idx_attendance_department (department),
      CONSTRAINT chk_checkout_after_checkin CHECK (checkOutAt IS NULL OR checkOutAt >= checkInAt)
    ) ENGINE=InnoDB`);
  }

  async down(queryRunner: QueryRunner) {
    await queryRunner.query("DROP TABLE attendance");
  }
}
