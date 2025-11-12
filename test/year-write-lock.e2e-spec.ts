import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource, ObjectLiteral, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { Users } from '../src/users/users.entity';
import { SchoolYears } from '../src/school_years/school_years.entity';
import { ClassGroups } from '../src/class_groups/class_groups.entity';
import { CourseInstances } from '../src/course_instances/course_instances.entity';
import { Courses } from '../src/courses/courses.entity';
import { Students } from '../src/students/students.entity';
import { Enrollments } from '../src/enrollments/enrollments.entity';
import { Terms } from '../src/terms/terms.entity';
import { Subjects } from '../src/subjects/subjects.entity';
import { SubjectAreas } from '../src/subject_areas/subject_areas.entity';
import { Grades } from '../src/grades/grades.entity';

const adminCredentials = { nationalId: '900001', password: 'Admin#12345' };
const teacherCredentials = { nationalId: '800001', password: 'Teach#12345' };

describe('Year write lock (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let teacherToken: string;

  const seededIds: { courseId: number; studentId: number; termId: number } = {
    courseId: 0,
    studentId: 0,
    termId: 0,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);

    await seedDatabase();

    adminToken = await login(
      adminCredentials.nationalId,
      adminCredentials.password,
    );
    teacherToken = await login(
      teacherCredentials.nationalId,
      teacherCredentials.password,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('prevents teachers from writing to inactive years while allowing admins', async () => {
    await request(app.getHttpServer())
      .post('/school-years/rollover')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ startDate: '2026-01-01', endDate: '2026-12-31' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/grades')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        studentId: seededIds.studentId,
        courseId: seededIds.courseId,
        termId: seededIds.termId,
        mark: 4,
      })
      .expect(403);

    const adminResponse = await request(app.getHttpServer())
      .post('/grades')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentId: seededIds.studentId,
        courseId: seededIds.courseId,
        termId: seededIds.termId,
        mark: 4,
      })
      .expect(201);

    expect(adminResponse.body).toEqual(
      expect.objectContaining({
        studentId: seededIds.studentId,
        courseId: seededIds.courseId,
        termId: seededIds.termId,
        mark: 'A',
      }),
    );
  });

  async function login(nationalId: string, password: string): Promise<string> {
    const { body } = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ nationalId, password })
      .expect(201);

    return body.accessToken;
  }

  async function wipe(repo: Repository<ObjectLiteral>): Promise<void> {
    await repo.createQueryBuilder().delete().where('1=1').execute();
  }

  async function seedDatabase(): Promise<void> {
    const gradesRepo = dataSource.getRepository(Grades);
    const enrollmentsRepo = dataSource.getRepository(Enrollments);
    const coursesRepo = dataSource.getRepository(Courses);
    const courseInstancesRepo = dataSource.getRepository(CourseInstances);
    const classGroupsRepo = dataSource.getRepository(ClassGroups);
    const termsRepo = dataSource.getRepository(Terms);
    const schoolYearsRepo = dataSource.getRepository(SchoolYears);
    const studentsRepo = dataSource.getRepository(Students);
    const usersRepo = dataSource.getRepository(Users);
    const subjectsRepo = dataSource.getRepository(Subjects);
    const subjectAreasRepo = dataSource.getRepository(SubjectAreas);

    await wipe(gradesRepo);
    await wipe(enrollmentsRepo);
    await wipe(coursesRepo);
    await wipe(courseInstancesRepo);
    await wipe(classGroupsRepo);
    await wipe(termsRepo);
    await wipe(schoolYearsRepo);
    await wipe(studentsRepo);
    await wipe(usersRepo);
    await wipe(subjectsRepo);
    await wipe(subjectAreasRepo);

    const adminPasswordHash = await bcrypt.hash(adminCredentials.password, 10);
    const teacherPasswordHash = await bcrypt.hash(
      teacherCredentials.password,
      10,
    );

    const savedUsers = await usersRepo.save([
      usersRepo.create({
        nationalId: adminCredentials.nationalId,
        username: 'admin-user',
        passwordHash: adminPasswordHash,
        role: 'admin',
        isActive: true,
      }),
      usersRepo.create({
        nationalId: teacherCredentials.nationalId,
        username: 'teacher-user',
        passwordHash: teacherPasswordHash,
        role: 'teacher',
        isActive: true,
      }),
    ]);
    const teacherUser = savedUsers[1];

    const subjectArea = await subjectAreasRepo.save(
      subjectAreasRepo.create({
        name: 'Core Studies',
        code: 'CORE',
      }),
    );

    const subject = await subjectsRepo.save(
      subjectsRepo.create({
        subjectCode: 'MATH-2025',
        name: 'Mathematics 2025',
        description: null,
        area: subjectArea,
      }),
    );

    const activeYear = await schoolYearsRepo.save(
      schoolYearsRepo.create({
        name: '2025-2026',
        yearStart: '2025-01-01',
        yearEnd: '2025-12-31',
        isActive: true,
      }),
    );

    const classGroup = await classGroupsRepo.save(
      classGroupsRepo.create({
        schoolYearId: activeYear.schoolYearId,
        schoolYear: activeYear,
        gradeLevel: 10,
        section: '01',
      }),
    );

    const courseInstance = await courseInstancesRepo.save(
      courseInstancesRepo.create({
        subjectId: subject.subjectId,
        subject,
        gradeLevel: 10,
        schoolYearId: activeYear.schoolYearId,
        schoolYear: activeYear,
        weeklyHours: 5,
        courseCode: 'ALG-2025',
        courseName: 'Algebra 2025',
        description: null,
        isActive: true,
      }),
    );

    const course = await coursesRepo.save(
      coursesRepo.create({
        courseInstanceId: courseInstance.courseInstanceId,
        courseInstance,
        classGroupId: classGroup.classGroupId,
        classGroup,
        teacherId: teacherUser.nationalId,
        teacher: teacherUser,
      }),
    );

    const term = await termsRepo.save(
      termsRepo.create({
        schoolYearId: activeYear.schoolYearId,
        schoolYear: activeYear,
        name: 'T1',
        startDate: '2025-08-01',
        endDate: '2025-12-15',
        sortOrder: 1,
        isFinal: false,
      }),
    );

    const student = await studentsRepo.save(
      studentsRepo.create({
        nationalId: '700001',
        firstName: 'Alice',
        lastName: 'Student',
        dob: '2010-01-01',
        address: '123 Main St',
        guardianName: 'Parent',
        guardianRelationship: 'Mother',
        guardianPhone: '5551234',
        isActive: true,
      }),
    );

    await enrollmentsRepo.save(
      enrollmentsRepo.create({
        studentId: student.studentId,
        student,
        classGroupId: classGroup.classGroupId,
        classGroup,
        schoolYearId: activeYear.schoolYearId,
        schoolYear: activeYear,
        active: true,
      }),
    );

    seededIds.courseId = Number(course.courseId);
    seededIds.studentId = Number(student.studentId);
    seededIds.termId = Number(term.termId);
  }
});
