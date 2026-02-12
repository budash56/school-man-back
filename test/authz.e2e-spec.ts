import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { seedBasicData, SeedResult } from './helpers/seed';
import { Users } from '../src/users/users.entity';
import { ClassGroups } from '../src/class_groups/class_groups.entity';
import { CourseInstances } from '../src/course_instances/course_instances.entity';
import { Courses } from '../src/courses/courses.entity';
import { Students } from '../src/students/students.entity';
import { TimetableAssignments } from '../src/timetable_assignments/timetable_assignments.entity';
import { TimetableSlot } from '../src/timetable_slots/timetable_slots.entity';
import { Attendance } from '../src/attendance/attendance.entity';
import { Enrollments } from '../src/enrollments/enrollments.entity';
import { Terms } from '../src/terms/terms.entity';
import { Grades } from '../src/grades/grades.entity';

const teacherTwoPassword = 'Teach2#123';

describe('Authorization flows (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let seedData: SeedResult;

  let coordinatorToken: string;
  let teacherOneToken: string;
  let teacherTwoToken: string;

  let otherCourseId: number;
  let attendanceSlotId: number;
  let attendanceStudentId: number;
  let timetableAssignmentId: string;
  let attendanceRecordId: number;
  let gradeId: number;
  let termId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);
    seedData = await seedBasicData(dataSource);

    coordinatorToken = await login(seedData.users.coordinator);
    teacherOneToken = await login(seedData.users.teacher);

    const teacherTwoCredentials = await ensureTeacherTwo();
    teacherTwoToken = await login(teacherTwoCredentials);

    await ensureAuthzFixtures(teacherTwoCredentials.nationalId);
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /students should return 401 without authentication', () => {
    return request(app.getHttpServer())
      .post('/students')
      .send({
        nationalId: `UNAUTH-${Date.now()}`,
        firstName: 'Unauth',
        lastName: 'User',
        guardianName: 'Guardian',
        guardianRelationship: 'Parent',
        guardianPhone: '5550000',
      })
      .expect(401);
  });

  it('POST /grades should return 403 for coordinator', () => {
    return request(app.getHttpServer())
      .post('/grades')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        studentId: attendanceStudentId,
        courseId: otherCourseId,
        termId,
        mark: 4,
      })
      .expect(403);
  });

  it('POST /attendance should return 403 for teacher creating attendance for another course', () => {
    return request(app.getHttpServer())
      .post('/attendance')
      .set('Authorization', `Bearer ${teacherOneToken}`)
      .send({
        studentId: attendanceStudentId,
        courseId: otherCourseId,
        slotId: attendanceSlotId,
        date: '2024-01-15',
        status: 'P',
      })
      .expect(403);
  });

  it('GET /attendance?scope=group should allow teacher for their class group', async () => {
    const response = await request(app.getHttpServer())
      .get('/attendance')
      .query({ scope: 'group' })
      .set('Authorization', `Bearer ${teacherTwoToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('restricts teacher from reading other teachers attendance/grades/timetable assignments', async () => {
    await request(app.getHttpServer())
      .get(`/attendance/${attendanceRecordId}`)
      .set('Authorization', `Bearer ${teacherOneToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get(`/attendance/${attendanceRecordId}`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/grades/${gradeId}`)
      .set('Authorization', `Bearer ${teacherOneToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get(`/grades/${gradeId}`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/timetable-assignments/${timetableAssignmentId}`)
      .set('Authorization', `Bearer ${teacherOneToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get(`/timetable-assignments/${timetableAssignmentId}`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .expect(200);
  });

  async function login(creds: { nationalId: string; password: string }): Promise<string> {
    const { body } = await request(app.getHttpServer())
      .post('/auth/login')
      .send(creds)
      .expect(201);
    return body.accessToken;
  }

  async function ensureTeacherTwo(): Promise<{ nationalId: string; password: string }> {
    const usersRepo = dataSource.getRepository(Users);
    const uniqueId = String(810000000 + (Date.now() % 100000));
    const existing = await usersRepo.findOne({ where: { nationalId: uniqueId } });
    const passwordHash = await bcrypt.hash(teacherTwoPassword, 10);

    if (!existing) {
      await usersRepo.save(
        usersRepo.create({
          nationalId: uniqueId,
          username: `teacher-two-${uniqueId}`,
          passwordHash,
          role: 'teacher',
          isActive: true,
        }),
      );
    } else {
      existing.passwordHash = passwordHash;
      existing.role = 'teacher';
      existing.isActive = true;
      await usersRepo.save(existing);
    }

    return { nationalId: uniqueId, password: teacherTwoPassword };
  }

  async function ensureAuthzFixtures(teacherTwoId: string): Promise<void> {
    const classGroupsRepo = dataSource.getRepository(ClassGroups);
    const courseInstancesRepo = dataSource.getRepository(CourseInstances);
    const coursesRepo = dataSource.getRepository(Courses);
    const studentsRepo = dataSource.getRepository(Students);
    const assignmentsRepo = dataSource.getRepository(TimetableAssignments);
    const slotsRepo = dataSource.getRepository(TimetableSlot);
    const attendanceRepo = dataSource.getRepository(Attendance);
    const enrollmentsRepo = dataSource.getRepository(Enrollments);
    const termsRepo = dataSource.getRepository(Terms);
    const gradesRepo = dataSource.getRepository(Grades);

    const sectionValue = (Date.now() % 90) + 10;
    const section = String(sectionValue).padStart(2, '0');

    const classGroup = await classGroupsRepo.save(
      classGroupsRepo.create({
        schoolYearId: seedData.schoolYear.schoolYearId,
        gradeLevel: 11,
        section,
      }),
    );

    const baseCourseInstance = await courseInstancesRepo.findOne({
      where: { courseInstanceId: seedData.course.courseInstanceId },
    });
    if (!baseCourseInstance) {
      throw new Error('Seed course instance missing for authz test');
    }

    const courseCode = `AUTHZ-${Date.now()}`;
    const courseInstance = await courseInstancesRepo.save(
      courseInstancesRepo.create({
        subjectId: baseCourseInstance.subjectId,
        gradeLevel: 11,
        schoolYearId: seedData.schoolYear.schoolYearId,
        weeklyHours: 5,
        courseCode,
        courseName: `Authz Course ${Date.now()}`,
        description: null,
        isActive: true,
      }),
    );

    const course = await coursesRepo.save(
      coursesRepo.create({
        courseInstanceId: courseInstance.courseInstanceId,
        classGroupId: classGroup.classGroupId,
        teacherId: teacherTwoId,
      }),
    );

    otherCourseId = Number(course.courseId);

    const hour = 10 + (Date.now() % 5);
    const startTime = `${String(hour).padStart(2, '0')}:00:00`;
    const endTime = `${String(hour).padStart(2, '0')}:45:00`;
    let slot = await slotsRepo.findOne({
      where: { dayOfWeek: 1, startTime, endTime },
    });
    if (!slot) {
      slot = await slotsRepo.save(
        slotsRepo.create({
          dayOfWeek: 1,
          startTime,
          endTime,
          durationMinutes: 45,
        }),
      );
    }
    attendanceSlotId = Number(slot.slotId);

    const assignment = await assignmentsRepo.save(
      assignmentsRepo.create({
        courseId: course.courseId.toString(),
        slotId: slot.slotId.toString(),
        teacherId: teacherTwoId,
        classGroupId: classGroup.classGroupId.toString(),
      }),
    );
    timetableAssignmentId = assignment.assignmentId;

    const student = await studentsRepo.save(
      studentsRepo.create({
        nationalId: `AUTHZ-STU-${Date.now()}`,
        firstName: 'Alice',
        lastName: 'Student',
        dob: '2010-01-01',
        address: '123 Main St',
        guardianName: 'Parent One',
        guardianRelationship: 'Mother',
        guardianPhone: '5551234',
        isActive: true,
      }),
    );
    attendanceStudentId = Number(student.studentId);

    await enrollmentsRepo.save(
      enrollmentsRepo.create({
        studentId: student.studentId,
        classGroupId: classGroup.classGroupId,
        schoolYearId: seedData.schoolYear.schoolYearId,
        active: true,
      }),
    );

    const attendanceRecord = await attendanceRepo.save(
      attendanceRepo.create({
        studentId: Number(student.studentId),
        courseId: Number(course.courseId),
        slotId: Number(slot.slotId),
        date: '2024-01-15',
        status: 'P',
      }),
    );
    attendanceRecordId = Number(attendanceRecord.attendanceId);

    let term = await termsRepo.findOne({
      where: { schoolYearId: seedData.schoolYear.schoolYearId, name: 'P1' },
    });
    if (!term) {
      term = await termsRepo.save(
        termsRepo.create({
          schoolYearId: seedData.schoolYear.schoolYearId,
          name: 'P1',
          startDate: '2025-01-01',
          endDate: '2025-02-01',
          sortOrder: 1,
          isFinal: false,
        }),
      );
    }

    termId = Number(term.termId);

    const grade = await gradesRepo.save(
      gradesRepo.create({
        studentId: student.studentId,
        courseId: course.courseId,
        termId: term.termId,
        mark: 5,
      }),
    );
    gradeId = Number(grade.gradeId);
  }
});
