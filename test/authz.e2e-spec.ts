import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Users } from '../src/users/users.entity';
import { SubjectAreas } from '../src/subject_areas/subject_areas.entity';
import { Subjects } from '../src/subjects/subjects.entity';
import { SchoolYears } from '../src/school_years/school_years.entity';
import { ClassGroups } from '../src/class_groups/class_groups.entity';
import { CourseInstances } from '../src/course_instances/course_instances.entity';
import { Courses } from '../src/courses/courses.entity';
import { Students } from '../src/students/students.entity';
import { TimetableSlot } from '../src/timetable_slots/timetable_slots.entity';
import { TimetableAssignments } from '../src/timetable_assignments/timetable_assignments.entity';
import { Attendance } from '../src/attendance/attendance.entity';
import { Enrollments } from '../src/enrollments/enrollments.entity';

describe('Authorization flows (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const adminCredentials = { nationalId: '900001', password: 'Admin#12345' };
  const coordinatorCredentials = {
    nationalId: '900002',
    password: 'Coord#12345',
  };
  const teacherOneCredentials = {
    nationalId: '800001',
    password: 'Teach1#123',
  };
  const teacherTwoCredentials = {
    nationalId: '800002',
    password: 'Teach2#123',
  };

  let coordinatorToken: string;
  let teacherOneToken: string;
  let teacherTwoToken: string;

  let otherCourseId: number;
  let attendanceSlotId: number;
  let attendanceStudentId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);

    await seedDatabase();

    coordinatorToken = await login(
      adminCredentials.nationalId,
      adminCredentials.password,
    ); // ensure admin exists for future use
    coordinatorToken = await login(
      coordinatorCredentials.nationalId,
      coordinatorCredentials.password,
    );
    teacherOneToken = await login(
      teacherOneCredentials.nationalId,
      teacherOneCredentials.password,
    );
    teacherTwoToken = await login(
      teacherTwoCredentials.nationalId,
      teacherTwoCredentials.password,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /students should return 401 without authentication', () => {
    return request(app.getHttpServer())
      .post('/students')
      .send({
        nationalId: '600010',
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
        studentId: 1,
        courseId: 1,
        termId: 1,
        mark: 'A',
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

  async function login(nationalId: string, password: string): Promise<string> {
    const { body } = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ nationalId, password })
      .expect(201);
    return body.accessToken;
  }

  async function wipe(repo: Repository<unknown>): Promise<void> {
    await repo.createQueryBuilder().delete().where('1=1').execute();
  }

  async function seedDatabase(): Promise<void> {
    const attendanceRepo = dataSource.getRepository(Attendance);
    const enrollmentsRepo = dataSource.getRepository(Enrollments);
    const coursesRepo = dataSource.getRepository(Courses);
    const assignmentsRepo = dataSource.getRepository(TimetableAssignments);
    const courseInstancesRepo = dataSource.getRepository(CourseInstances);
    const classGroupsRepo = dataSource.getRepository(ClassGroups);
    const schoolYearsRepo = dataSource.getRepository(SchoolYears);
    const subjectsRepo = dataSource.getRepository(Subjects);
    const subjectAreasRepo = dataSource.getRepository(SubjectAreas);
    const studentsRepo = dataSource.getRepository(Students);
    const usersRepo = dataSource.getRepository(Users);
    const slotsRepo = dataSource.getRepository(TimetableSlot);

    await wipe(attendanceRepo);
    await wipe(enrollmentsRepo);
    await wipe(coursesRepo);
    await wipe(courseInstancesRepo);
    await wipe(classGroupsRepo);
    await wipe(schoolYearsRepo);
    await wipe(subjectsRepo);
    await wipe(subjectAreasRepo);
    await wipe(studentsRepo);
    await wipe(usersRepo);
    await wipe(slotsRepo);

    const adminPasswordHash = await bcrypt.hash(adminCredentials.password, 10);
    const coordinatorPasswordHash = await bcrypt.hash(
      coordinatorCredentials.password,
      10,
    );
    const teacherOnePasswordHash = await bcrypt.hash(
      teacherOneCredentials.password,
      10,
    );
    const teacherTwoPasswordHash = await bcrypt.hash(
      teacherTwoCredentials.password,
      10,
    );

    await usersRepo.save([
      usersRepo.create({
        nationalId: adminCredentials.nationalId,
        username: 'admin-user',
        passwordHash: adminPasswordHash,
        role: 'admin',
        isActive: true,
      }),
      usersRepo.create({
        nationalId: coordinatorCredentials.nationalId,
        username: 'coordinator-user',
        passwordHash: coordinatorPasswordHash,
        role: 'coordinator',
        isActive: true,
      }),
      usersRepo.create({
        nationalId: teacherOneCredentials.nationalId,
        username: 'teacher-one',
        passwordHash: teacherOnePasswordHash,
        role: 'teacher',
        isActive: true,
      }),
      usersRepo.create({
        nationalId: teacherTwoCredentials.nationalId,
        username: 'teacher-two',
        passwordHash: teacherTwoPasswordHash,
        role: 'teacher',
        isActive: true,
      }),
    ]);

    const subjectArea = await subjectAreasRepo.save(
      subjectAreasRepo.create({
        name: 'STEM',
        code: 'STEM',
      }),
    );

    const subjectMath = await subjectsRepo.save(
      subjectsRepo.create({
        subjectCode: 'MATH-101',
        name: 'Mathematics 101',
        description: null,
        area: subjectArea,
      }),
    );

    const subjectScience = await subjectsRepo.save(
      subjectsRepo.create({
        subjectCode: 'SCI-201',
        name: 'Science 201',
        description: null,
        area: subjectArea,
      }),
    );

    const schoolYearOne = await schoolYearsRepo.save(
      schoolYearsRepo.create({
        name: '2024-2025',
        yearStart: '2024-01-01',
        yearEnd: '2024-12-31',
        isActive: true,
      }),
    );

    const schoolYearTwo = await schoolYearsRepo.save(
      schoolYearsRepo.create({
        name: '2025-2026',
        yearStart: '2025-01-01',
        yearEnd: '2025-12-31',
        isActive: true,
      }),
    );

    const classGroupOne = await classGroupsRepo.save(
      classGroupsRepo.create({
        gradeLevel: 10,
        section: '01',
        schoolYearId: schoolYearOne.schoolYearId,
        schoolYear: schoolYearOne,
      }),
    );

    const classGroupTwo = await classGroupsRepo.save(
      classGroupsRepo.create({
        gradeLevel: 11,
        section: '02',
        schoolYearId: schoolYearTwo.schoolYearId,
        schoolYear: schoolYearTwo,
      }),
    );

    const courseInstanceOne = await courseInstancesRepo.save(
      courseInstancesRepo.create({
        subjectId: subjectMath.subjectId,
        subject: subjectMath,
        gradeLevel: 10,
        schoolYearId: schoolYearOne.schoolYearId,
        schoolYear: schoolYearOne,
        weeklyHours: 5,
        courseCode: 'ALG-2024',
        courseName: 'Algebra I',
        description: null,
        isActive: true,
      }),
    );

    const courseInstanceTwo = await courseInstancesRepo.save(
      courseInstancesRepo.create({
        subjectId: subjectScience.subjectId,
        subject: subjectScience,
        gradeLevel: 11,
        schoolYearId: schoolYearTwo.schoolYearId,
        schoolYear: schoolYearTwo,
        weeklyHours: 5,
        courseCode: 'SCI-2025',
        courseName: 'Science II',
        description: null,
        isActive: true,
      }),
    );

    await coursesRepo.save(
      coursesRepo.create({
        courseInstanceId: courseInstanceOne.courseInstanceId,
        courseInstance: courseInstanceOne,
        classGroupId: classGroupOne.classGroupId,
        classGroup: classGroupOne,
        teacherId: teacherOneCredentials.nationalId,
      }),
    );

    const teacherTwoCourse = await coursesRepo.save(
      coursesRepo.create({
        courseInstanceId: courseInstanceTwo.courseInstanceId,
        courseInstance: courseInstanceTwo,
        classGroupId: classGroupTwo.classGroupId,
        classGroup: classGroupTwo,
        teacherId: teacherTwoCredentials.nationalId,
      }),
    );

    const slot = await slotsRepo.save(
      slotsRepo.create({
        dayOfWeek: 1,
        startTime: '08:00:00',
        endTime: '08:45:00',
      }),
    );

    await assignmentsRepo.save(
      assignmentsRepo.create({
        courseId: teacherTwoCourse.courseId,
        slotId: slot.slotId,
        teacherId: teacherTwoCourse.teacherId,
        classGroupId: teacherTwoCourse.classGroupId,
      }),
    );

    const student = await studentsRepo.save(
      studentsRepo.create({
        nationalId: '600001',
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

    await enrollmentsRepo.save(
      enrollmentsRepo.create({
        studentId: student.studentId,
        classGroupId: classGroupTwo.classGroupId,
        schoolYearId: schoolYearTwo.schoolYearId,
        active: true,
      }),
    );

    await attendanceRepo.save(
      attendanceRepo.create({
        studentId: student.studentId,
        courseId: teacherTwoCourse.courseId,
        slotId: slot.slotId.toString(),
        date: '2024-01-15',
        status: 'P',
      }),
    );

    otherCourseId = Number(teacherTwoCourse.courseId);
    attendanceSlotId = slot.slotId;
    attendanceStudentId = Number(student.studentId);
  }
});
