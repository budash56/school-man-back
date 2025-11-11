import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { appDataSourceOptions } from './data-source';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { RepositoriesModule } from './repositories/repositories.module';
import { SharedModule } from './shared/shared.module';
import { Attendance } from './attendance/attendance.entity';
import { AttendanceService } from './attendance/attendance.service';
import { AuditLogs } from './audit_logs/audit_logs.entity';
import { ClassGroups } from './class_groups/class_groups.entity';
import { ClassGroupsService } from './class_groups/class_groups.service';
import { Classrooms } from './classrooms/classrooms.entity';
import { ClassroomsService } from './classrooms/classrooms.service';
import { CourseInstances } from './course_instances/course_instances.entity';
import { CourseInstancesService } from './course_instances/course_instances.service';
import { Courses } from './courses/courses.entity';
import { CoursesService } from './courses/courses.service';
import { DisciplinaryRecords } from './disciplinary_records/disciplinary_records.entity';
import { DisciplinaryRecordsService } from './disciplinary_records/disciplinary_records.service';
import { Enrollments } from './enrollments/enrollments.entity';
import { EnrollmentsService } from './enrollments/enrollments.service';
import { Grades } from './grades/grades.entity';
import { GradesService } from './grades/grades.service';
import { GradeSchemes } from './grade_schemes/grade_schemes.entity';
import { GradeSchemeValues } from './grade_scheme_values/grade_scheme_values.entity';
import { Notifications } from './notifications/notifications.entity';
import { NotificationsService } from './notifications/notifications.service';
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
import { UsersService } from './users/users.service';
import { AttendanceController } from './attendance/attendance.controller';
import { AuditLogsController } from './audit_logs/audit_logs.controller';
import { AuditLogsService } from './audit_logs/audit_logs.service';
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
import { TimetableAssignmentsService } from './timetable_assignments/timetable_assignments.service';
import { TimetableSlotsController } from './timetable_slots/timetable_slots.controller';
import { UsersController } from './users/users.controller';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';

const isOpenApiExport = process.env.OPENAPI_EXPORT === '1';

const typeOrmConfig: TypeOrmModuleOptions = {
  ...appDataSourceOptions,
  autoLoadEntities: true,
  ...(isOpenApiExport
    ? {
        logging: false,
        retryAttempts: 0,
        connectTimeoutMS: 1000,
      }
    : {}),
};

@Module({
  imports: [
    TypeOrmModule.forRoot(typeOrmConfig),
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
    SharedModule,
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
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    AppService,
    AttendanceService,
    AuditLogsService,
    ClassGroupsService,
    ClassroomsService,
    CourseInstancesService,
    CoursesService,
    DisciplinaryRecordsService,
    EnrollmentsService,
    GradesService,
    NotificationsService,
    TimetableAssignmentsService,
    StudentsService,
    SubjectAreasService,
    SubjectsService,
    SchoolYearsService,
    TermsService,
    UsersService,
  ],
})
export class AppModule {}
