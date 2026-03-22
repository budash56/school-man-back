import { AttendanceRepository } from '../attendance/attendance.repository';
import { AuditLogsRepository } from '../audit_logs/audit_logs.repository';
import { BuildingsRepository } from '../buildings/buildings.repository';
import { ClassGroupsRepository } from '../class_groups/class_groups.repository';
import { ClassGroupFixedLocationsRepository } from '../class_group_fixed_locations/class_group_fixed_locations.repository';
import { ClassroomsRepository } from '../classrooms/classrooms.repository';
import { CourseInstancesRepository } from '../course_instances/course_instances.repository';
import { CoursesRepository } from '../courses/courses.repository';
import { CurriculaRepository } from '../curricula/curricula.repository';
import { CurriculumItemsRepository } from '../curriculum_items/curriculum_items.repository';
import { ClassGroupCurriculumOverridesRepository } from '../class_group_curriculum_overrides/class_group_curriculum_overrides.repository';
import { DisciplinaryRecordsRepository } from '../disciplinary_records/disciplinary_records.repository';
import { EnrollmentsRepository } from '../enrollments/enrollments.repository';
import { GradeSchemeValuesRepository } from '../grade_scheme_values/grade_scheme_values.repository';
import { GradeSchemesRepository } from '../grade_schemes/grade_schemes.repository';
import { GradesRepository } from '../grades/grades.repository';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { PlanillaSheetsRepository } from '../planillas/planillas.repository';
import { SchoolYearsRepository } from '../school_years/school_years.repository';
import { StudentsRepository } from '../students/students.repository';
import { SubjectAreasRepository } from '../subject_areas/subject_areas.repository';
import { SubjectsRepository } from '../subjects/subjects.repository';
import { TermsRepository } from '../terms/terms.repository';
import { TimetableAssignmentsRepository } from '../timetable_assignments/timetable_assignments.repository';
import { TimetableSlotRepository } from '../timetable_slots/timetable_slots.repository';
import { TeacherSubjectsRepository } from '../teacher_subjects/teacher_subjects.repository';
import { UsersRepository } from '../users/users.repository';

export const REPOSITORY_PROVIDERS = [
  AttendanceRepository,
  AuditLogsRepository,
  BuildingsRepository,
  ClassGroupsRepository,
  ClassGroupFixedLocationsRepository,
  ClassroomsRepository,
  CourseInstancesRepository,
  CoursesRepository,
  CurriculaRepository,
  CurriculumItemsRepository,
  ClassGroupCurriculumOverridesRepository,
  DisciplinaryRecordsRepository,
  EnrollmentsRepository,
  GradeSchemeValuesRepository,
  GradeSchemesRepository,
  GradesRepository,
  NotificationsRepository,
  PlanillaSheetsRepository,
  SchoolYearsRepository,
  StudentsRepository,
  SubjectAreasRepository,
  SubjectsRepository,
  TermsRepository,
  TimetableAssignmentsRepository,
  TimetableSlotRepository,
  TeacherSubjectsRepository,
  UsersRepository,
] as const;

export {
  AttendanceRepository,
  AuditLogsRepository,
  BuildingsRepository,
  ClassGroupsRepository,
  ClassGroupFixedLocationsRepository,
  ClassroomsRepository,
  CourseInstancesRepository,
  CoursesRepository,
  CurriculaRepository,
  CurriculumItemsRepository,
  ClassGroupCurriculumOverridesRepository,
  DisciplinaryRecordsRepository,
  EnrollmentsRepository,
  GradeSchemeValuesRepository,
  GradeSchemesRepository,
  GradesRepository,
  NotificationsRepository,
  PlanillaSheetsRepository,
  SchoolYearsRepository,
  StudentsRepository,
  SubjectAreasRepository,
  SubjectsRepository,
  TermsRepository,
  TimetableAssignmentsRepository,
  TimetableSlotRepository,
  TeacherSubjectsRepository,
  UsersRepository,
};
