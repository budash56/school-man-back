import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { CourseInstances } from "../course_instances/CourseInstances.entity";

@Index("subjects_name_key", ["name"], { unique: true })
@Index("subjects_subject_code_key", ["subjectCode"], { unique: true })
@Index("subjects_pkey", ["subjectId"], { unique: true })
@Entity("subjects", { schema: "public" })
export class Subjects {
  @PrimaryGeneratedColumn({ type: "bigint", name: "subject_id" })
  subjectId: string;

  @Column("character varying", { name: "name", unique: true, length: 120 })
  name: string;

  @Column("text", { name: "description", nullable: true })
  description: string | null;

  @Column("timestamp with time zone", {
    name: "created_at",
    nullable: true,
    default: () => "now()",
  })
  createdAt: Date | null;

  @Column("character varying", {
    name: "subject_code",
    nullable: true,
    unique: true,
    length: 20,
  })
  subjectCode: string | null;

  @Column("boolean", {
    name: "is_active",
    nullable: true,
    default: () => "true",
  })
  isActive: boolean | null;

  @OneToMany(
    () => CourseInstances,
    (courseInstances) => courseInstances.subject
  )
  courseInstances: CourseInstances[];
}
