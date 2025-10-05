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

@Index("observations_pkey", ["observationId"], { unique: true })
@Entity("observations", { schema: "public" })
export class Observations {
  @PrimaryGeneratedColumn({ type: "bigint", name: "observation_id" })
  observationId: string;

  @Column("text", { name: "note_text" })
  noteText: string;

  @Column("date", { name: "date_recorded" })
  dateRecorded: string;

  @Column("timestamp with time zone", {
    name: "created_at",
    nullable: true,
    default: () => "now()",
  })
  createdAt: Date | null;

  @ManyToOne(() => Users, (users) => users.observations)
  @JoinColumn([{ name: "recorded_by", referencedColumnName: "nationalId" }])
  recordedBy: Users;

  @ManyToOne(() => Students, (students) => students.observations)
  @JoinColumn([{ name: "student_id", referencedColumnName: "studentId" }])
  student: Students;
}
