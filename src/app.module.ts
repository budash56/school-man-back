import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersController } from './users/users.controller';
import { StudentsController } from './students/students.controller';
import { AttendanceController } from './attendance/attendance.controller';
import { ClassroomsController } from './classrooms/classrooms.controller';
import { CoursesController } from './courses/courses.controller';
import { SubjectsController } from './subjects/subjects.controller';
import { EnrollmentsController } from './enrollments/enrollments.controller';
import { GradesController } from './grades/grades.controller';
import { CourseInstancesController } from './course_instances/course_instances.controller';
import { DisciplinaryRecordsController } from './disciplinary_records/disciplinary_records.controller';
import { ClassGroupsController } from './class_groups/class_groups.controller';
import { TimetableSlotsController } from './timetable_slots/timetable_slots.controller';
import { TimetableAssignmentsController } from './timetable_assignments/timetable_assignments.controller';
import { SchoolPeriodsController } from './school_periods/school_periods.controller';
import { ReportTemplatesController } from './report_templates/report_templates.controller';
import { ObservationsController } from './observations/observations.controller';
import { AuditLogsController } from './audit_logs/audit_logs.controller';
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: '1234',
      database: 'TestDB',
      // entities: [],
      autoLoadEntities: true,
      synchronize: true, // change in production
    }),
    AuthModule,
  ],
  controllers: [AppController, UsersController, StudentsController, AttendanceController, ClassroomsController, CoursesController, SubjectsController, EnrollmentsController, GradesController, CourseInstancesController, DisciplinaryRecordsController, ClassGroupsController, TimetableSlotsController, TimetableAssignmentsController, SchoolPeriodsController, ReportTemplatesController, ObservationsController, AuditLogsController],
  providers: [AppService],
})
export class AppModule {}
