import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Users } from "../users/Users.entity";
import { Students } from "../students/Students.entity";

@Index("disciplinary_records_pkey", ["disciplinaryId"], { unique: true })
@Entity("disciplinary_records", { schema: "public" })
export class DisciplinaryRecords {
  @PrimaryGeneratedColumn({ type: "bigint", name: "disciplinary_id" })
  disciplinaryId: string;

  @Column("date", { name: "date_happened" })
  dateHappened: string;

  @Column("enum", {
    name: "category",
    enum: ["llamado", "verde", "amarilla", "roja", "ultima_oportunidad"],
  })
  category: "llamado" | "verde" | "amarilla" | "roja" | "ultima_oportunidad";

  @Column("text", { name: "description", nullable: true })
  description: string | null;

  @Column("text", { name: "action_taken", nullable: true })
  actionTaken: string | null;

  @Column("timestamp with time zone", {
    name: "created_at",
    nullable: true,
    default: () => "now()",
  })
  createdAt: Date | null;

  @Column("date", { name: "expires_at", nullable: true })
  expiresAt: string | null;

  @ManyToOne(() => Users, (users) => users.disciplinaryRecords)
  @JoinColumn([{ name: "recorded_by", referencedColumnName: "nationalId" }])
  recordedBy: Users;

  @ManyToOne(() => Students, (students) => students.disciplinaryRecords)
  @JoinColumn([{ name: "student_id", referencedColumnName: "studentId" }])
  student: Students;
}
