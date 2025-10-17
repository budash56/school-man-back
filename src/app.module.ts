import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { RepositoriesModule } from './repositories/repositories.module';
import { Attendance } from './attendance/attendance.entity';
import { AuditLogs } from './audit_logs/audit_logs.entity';
import { ClassGroups } from './class_groups/class_groups.entity';
import { Classrooms } from './classrooms/classrooms.entity';
import { CourseInstances } from './course_instances/course_instances.entity';
import { CourseInstancesService } from './course_instances/course_instances.service';
import { Courses } from './courses/courses.entity';
import { DisciplinaryRecords } from './disciplinary_records/disciplinary_records.entity';
import { Enrollments } from './enrollments/enrollments.entity';
import { Grades } from './grades/grades.entity';
import { GradeSchemes } from './grade_schemes/grade_schemes.entity';
import { GradeSchemeValues } from './grade_scheme_values/grade_scheme_values.entity';
import { Notifications } from './notifications/notifications.entity';
import { SchoolYears } from './school_years/school_years.entity';
import { SchoolYearsService } from './school_years/school_years.service';
import { Students } from './students/students.entity';
import { StudentsService } from './students/students.service';
import { SubjectAreas } from './subject_areas/subject_areas.entity';
import { SubjectAreasService } from './subject_areas/subject_areas.service';
import { Subjects } from './subjects/subjects.entity';
import { SubjectsService } from './subjects/subjects.service';
import { Terms } from './terms/terms.entity';
import { TermsService } from './terms/terms.service';
import { TimetableAssignments } from './timetable_assignments/timetable_assignments.entity';
import { TimetableSlot } from './timetable_slots/timetable_slots.entity';
import { Users } from './users/users.entity';
import { AttendanceController } from './attendance/attendance.controller';
import { AuditLogsController } from './audit_logs/audit_logs.controller';
import { ClassGroupsController } from './class_groups/class_groups.controller';
import { ClassroomsController } from './classrooms/classrooms.controller';
import { CourseInstancesController } from './course_instances/course_instances.controller';
import { CoursesController } from './courses/courses.controller';
import { DisciplinaryRecordsController } from './disciplinary_records/disciplinary_records.controller';
import { EnrollmentsController } from './enrollments/enrollments.controller';
import { GradesController } from './grades/grades.controller';
import { GradeSchemesController } from './grade_schemes/grade_schemes.controller';
import { GradeSchemeValuesController } from './grade_scheme_values/grade_scheme_values.controller';
import { NotificationsController } from './notifications/notifications.controller';
import { SchoolYearsController } from './school_years/school_years.controller';
import { StudentsController } from './students/students.controller';
import { SubjectAreasController } from './subject_areas/subject_areas.controller';
import { SubjectsController } from './subjects/subjects.controller';
import { TermsController } from './terms/terms.controller';
import { TimetableAssignmentsController } from './timetable_assignments/timetable_assignments.controller';
import { TimetableSlotsController } from './timetable_slots/timetable_slots.controller';
import { UsersController } from './users/users.controller';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: '1234',
      database: 'SchoolManBeta',
      autoLoadEntities: true,
      synchronize: false, 
    }),
    TypeOrmModule.forFeature([
      Attendance,
      AuditLogs,
      ClassGroups,
      Classrooms,
      CourseInstances,
      Courses,
      DisciplinaryRecords,
      Enrollments,
      Grades,
      GradeSchemes,
      GradeSchemeValues,
      Notifications,
      SchoolYears,
      Students,
      SubjectAreas,
      Subjects,
      Terms,
      TimetableAssignments,
      TimetableSlot,
      Users,
    ]),
    AuthModule,
    RepositoriesModule,
  ],
  controllers: [
    AppController,
    AttendanceController,
    AuditLogsController,
    ClassGroupsController,
    ClassroomsController,
    CourseInstancesController,
    CoursesController,
    DisciplinaryRecordsController,
    EnrollmentsController,
    GradesController,
    GradeSchemesController,
    GradeSchemeValuesController,
    NotificationsController,
    SchoolYearsController,
    StudentsController,
    SubjectAreasController,
    SubjectsController,
    TermsController,
    TimetableAssignmentsController,
    TimetableSlotsController,
    UsersController,
  ],
  providers: [
    AppService,
    StudentsService,
    SubjectAreasService,
    SubjectsService,
    SchoolYearsService,
    TermsService,
    CourseInstancesService,
  ],
})
export class AppModule {}
