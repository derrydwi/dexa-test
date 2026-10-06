import { Column, Entity, Index, PrimaryColumn } from "typeorm";

@Entity("attendance")
@Index(["employeeId", "workDate"], { unique: true })
export class Attendance {
  @PrimaryColumn({ type: "char", length: 36 })
  id!: string;

  @Column({ type: "char", length: 36 })
  employeeId!: string;

  @Column({ type: "varchar", length: 24 })
  employeeCode!: string;

  @Column({ type: "varchar", length: 100 })
  fullName!: string;

  @Column({ type: "varchar", length: 80 })
  department!: string;

  @Column({ type: "date" })
  workDate!: string;

  @Column({ type: "datetime", precision: 3 })
  checkInAt!: Date;

  @Column({ type: "datetime", precision: 3, nullable: true })
  checkOutAt!: Date | null;

  @Column({ type: "varchar", length: 64 })
  checkInPhoto!: string;

  @Column({ type: "varchar", length: 64, nullable: true })
  checkOutPhoto!: string | null;
}
