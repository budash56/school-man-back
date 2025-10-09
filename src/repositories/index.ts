import { AttendanceRepository } from '../attendance/attendance.repository';
import { AuditLogsRepository } from '../audit_logs/audit_logs.repository';
import { ClassGroupsRepository } from '../class_groups/class_groups.repository';
import { ClassroomsRepository } from '../classrooms/classrooms.repository';
import { CourseInstancesRepository } from '../course_instances/course_instances.repository';
import { CoursesRepository } from '../courses/courses.repository';
import { DisciplinaryRecordsRepository } from '../disciplinary_records/disciplinary_records.repository';
import { EnrollmentsRepository } from '../enrollments/enrollments.repository';
import { GradeSchemeValuesRepository } from '../grade_scheme_values/grade_scheme_values.repository';
import { GradeSchemesRepository } from '../grade_schemes/grade_schemes.repository';
import { GradesRepository } from '../grades/grades.repository';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { SchoolYearsRepository } from '../school_years/school_years.repository';
import { StudentsRepository } from '../students/students.repository';
import { SubjectAreasRepository } from '../subject_areas/subject_areas.repository';
import { SubjectsRepository } from '../subjects/subjects.repository';
import { TermsRepository } from '../terms/terms.repository';
import { TimetableAssignmentsRepository } from '../timetable_assignments/timetable_assignments.repository';
import { TimetableSlotRepository } from '../timetable_slots/timetable_slots.repository';
import { UsersRepository } from '../users/users.repository';

export const REPOSITORY_PROVIDERS = [
  AttendanceRepository,
  AuditLogsRepository,
  ClassGroupsRepository,
  ClassroomsRepository,
  CourseInstancesRepository,
  CoursesRepository,
  DisciplinaryRecordsRepository,
  EnrollmentsRepository,
  GradeSchemeValuesRepository,
  GradeSchemesRepository,
  GradesRepository,
  NotificationsRepository,
  SchoolYearsRepository,
  StudentsRepository,
  SubjectAreasRepository,
  SubjectsRepository,
  TermsRepository,
  TimetableAssignmentsRepository,
  TimetableSlotRepository,
  UsersRepository,
] as const;

export {
  AttendanceRepository,
  AuditLogsRepository,
  ClassGroupsRepository,
  ClassroomsRepository,
  CourseInstancesRepository,
  CoursesRepository,
  DisciplinaryRecordsRepository,
  EnrollmentsRepository,
  GradeSchemeValuesRepository,
  GradeSchemesRepository,
  GradesRepository,
  NotificationsRepository,
  SchoolYearsRepository,
  StudentsRepository,
  SubjectAreasRepository,
  SubjectsRepository,
  TermsRepository,
  TimetableAssignmentsRepository,
  TimetableSlotRepository,
  UsersRepository,
};
