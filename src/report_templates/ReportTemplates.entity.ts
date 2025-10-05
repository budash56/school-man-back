import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Users } from "../users/Users.entity";

@Index("report_templates_pkey", ["templateId"], { unique: true })
@Entity("report_templates", { schema: "public" })
export class ReportTemplates {
  @PrimaryGeneratedColumn({ type: "bigint", name: "template_id" })
  templateId: string;

  @Column("character varying", { name: "name", nullable: true, length: 120 })
  name: string | null;

  @Column("jsonb", { name: "template_json", nullable: true })
  templateJson: object | null;

  @Column("timestamp with time zone", {
    name: "created_at",
    nullable: true,
    default: () => "now()",
  })
  createdAt: Date | null;

  @ManyToOne(() => Users, (users) => users.reportTemplates)
  @JoinColumn([{ name: "created_by", referencedColumnName: "nationalId" }])
  createdBy: Users;
}
