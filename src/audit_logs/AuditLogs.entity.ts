import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Users } from "../users/Users.entity";

@Index("audit_logs_pkey", ["auditId"], { unique: true })
@Entity("audit_logs", { schema: "public" })
export class AuditLogs {
  @PrimaryGeneratedColumn({ type: "bigint", name: "audit_id" })
  auditId: string;

  @Column("text", { name: "entity_name" })
  entityName: string;

  @Column("bigint", { name: "entity_id", nullable: true })
  entityId: string | null;

  @Column("character varying", { name: "action", length: 20 })
  action: string;

  @Column("jsonb", { name: "payload", nullable: true })
  payload: object | null;

  @Column("timestamp with time zone", {
    name: "performed_at",
    nullable: true,
    default: () => "now()",
  })
  performedAt: Date | null;

  @ManyToOne(() => Users, (users) => users.auditLogs)
  @JoinColumn([{ name: "performed_by", referencedColumnName: "nationalId" }])
  performedBy: Users;
}
