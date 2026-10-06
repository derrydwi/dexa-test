import { Column, Entity, Index, PrimaryColumn } from "typeorm";

@Entity("sessions")
export class Session {
  @PrimaryColumn({ type: "char", length: 64 })
  tokenHash!: string;

  @Index()
  @Column({ type: "char", length: 36 })
  employeeId!: string;

  @Column({ type: "datetime", precision: 3 })
  expiresAt!: Date;
}
