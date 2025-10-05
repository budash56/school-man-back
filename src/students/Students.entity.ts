import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Attendance } from "../attendance/Attendance.entity";
import { DisciplinaryRecords } from "../disciplinary_records/DisciplinaryRecords.entity";
import { Enrollments } from "../enrollments/Enrollments.entity";
import { Grades } from "../grades/Grades.entity";
import { Observations } from "../observations/Observations.entity";

@Index("students_national_id_key", ["nationalId"], { unique: true })
@Index("students_pkey", ["studentId"], { unique: true })
@Entity("students", { schema: "public" })
export class Students {
  @PrimaryGeneratedColumn({ type: "bigint", name: "student_id" })
  studentId: string;

  @Column("character varying", {
    name: "national_id",
    unique: true,
    length: 50,
  })
  nationalId: string;

  @Column("character varying", { name: "first_name", length: 80 })
  firstName: string;

  @Column("character varying", { name: "last_name", length: 80 })
  lastName: string;

  @Column("date", { name: "dob", nullable: true })
  dob: string | null;

  @Column("text", { name: "address", nullable: true })
  address: string | null;

  @Column("character varying", {
    name: "guardian_phone",
    nullable: true,
    length: 50,
  })
  guardianPhone: string | null;

  @Column("boolean", {
    name: "uses_bus",
    nullable: true,
    default: () => "false",
  })
  usesBus: boolean | null;

  @Column("boolean", {
    name: "has_venereal_police_process",
    nullable: true,
    default: () => "false",
  })
  hasVenerealPoliceProcess: boolean | null;

  @Column("boolean", {
    name: "is_active",
    nullable: true,
    default: () => "true",
  })
  isActive: boolean | null;

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

  @Column("timestamp with time zone", { name: "deleted_at", nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => Attendance, (attendance) => attendance.student)
  attendances: Attendance[];

  @OneToMany(
    () => DisciplinaryRecords,
    (disciplinaryRecords) => disciplinaryRecords.student
  )
  disciplinaryRecords: DisciplinaryRecords[];

  @OneToMany(() => Enrollments, (enrollments) => enrollments.student)
  enrollments: Enrollments[];

  @OneToMany(() => Grades, (grades) => grades.student)
  grades: Grades[];

  @OneToMany(() => Observations, (observations) => observations.student)
  observations: Observations[];
}
