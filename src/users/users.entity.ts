import { Column, Entity, Index, OneToMany } from "typeorm";
import { Attendance } from "../attendance/Attendance.entity";
import { AuditLogs } from "../audit_logs/AuditLogs.entity";
import { Courses } from "../courses/Courses.entity";
import { DisciplinaryRecords } from "../disciplinary_records/DisciplinaryRecords.entity";
import { Grades } from "../grades/Grades.entity";
import { Observations } from "../observations/Observations.entity";
import { ReportTemplates } from "../report_templates/ReportTemplates.entity";

@Index("users_pkey", ["nationalId"], { unique: true })
@Index("users_username_key", ["username"], { unique: true })
@Entity("users", { schema: "public" })
export class Users {
  @Column("character varying", {
    primary: true,
    name: "national_id",
    length: 50,
  })
  nationalId: string;

  @Column("character varying", { name: "username", unique: true, length: 80 })
  username: string;

  @Column("text", { name: "password_hash" })
  passwordHash: string;

  @Column("enum", {
    name: "role",
    enum: ["teacher", "coordinator", "management"],
  })
  role: "teacher" | "coordinator" | "management";

  @Column("character varying", {
    name: "first_name",
    nullable: true,
    length: 80,
  })
  firstName: string | null;

  @Column("character varying", {
    name: "last_name",
    nullable: true,
    length: 80,
  })
  lastName: string | null;

  @Column("character varying", { name: "email", nullable: true, length: 150 })
  email: string | null;

  @Column("character varying", { name: "phone", nullable: true, length: 30 })
  phone: string | null;

  @Column("boolean", { name: "is_active", default: () => "true" })
  isActive: boolean;

  @Column("timestamp with time zone", {
    name: "created_at",
    nullable: true,
    default: () => "now()",
  })
  createdAt: Date | null;

  @Column("timestamp with time zone", {
    name: "updated_at",
    nullable: true,
    default: () => "now()",
  })
  updatedAt: Date | null;

  @OneToMany(() => Attendance, (attendance) => attendance.recordedBy)
  attendances: Attendance[];

  @OneToMany(() => AuditLogs, (auditLogs) => auditLogs.performedBy)
  auditLogs: AuditLogs[];

  @OneToMany(() => Courses, (courses) => courses.teacher)
  courses: Courses[];

  @OneToMany(
    () => DisciplinaryRecords,
    (disciplinaryRecords) => disciplinaryRecords.recordedBy
  )
  disciplinaryRecords: DisciplinaryRecords[];

  @OneToMany(() => Grades, (grades) => grades.recordedBy)
  grades: Grades[];

  @OneToMany(() => Observations, (observations) => observations.recordedBy)
  observations: Observations[];

  @OneToMany(
    () => ReportTemplates,
    (reportTemplates) => reportTemplates.createdBy
  )
  reportTemplates: ReportTemplates[];
}
