import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { seedBasicData, SeedResult } from './helpers/seed';
import { Students } from '../src/students/students.entity';
import { Terms } from '../src/terms/terms.entity';
import { Grades } from '../src/grades/grades.entity';
import { Users } from '../src/users/users.entity';
import { PlanillaSheets } from '../src/planillas/planilla_sheets.entity';
import { Enrollments } from '../src/enrollments/enrollments.entity';

async function login(
  app: INestApplication,
  creds: { nationalId: string; password: string },
): Promise<string> {
  const { body } = await request(app.getHttpServer())
    .post('/auth/login')
    .send(creds)
    .expect(201);
  return body.accessToken as string;
}

describe('Reports (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let seedData: SeedResult;
  let coordinatorToken: string;
  let teacherToken: string;
  let outsiderTeacherToken: string;
  let registrarToken: string;
  let student: Students;
  let terms: Terms[];
  let planillaGroupCode: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);
    seedData = await seedBasicData(dataSource);

    await setupStudentsAndGrades();

    coordinatorToken = await login(app, seedData.users.coordinator);
    teacherToken = await login(app, seedData.users.teacher);
    registrarToken = await login(app, seedData.users.registrar);
    outsiderTeacherToken = await createAndLoginOutsiderTeacher();
    await setupPlanillaDocuments();
  });

  afterAll(async () => {
    await app.close();
  });

  async function setupStudentsAndGrades(): Promise<void> {
    const studentsRepo = dataSource.getRepository(Students);
    const termsRepo = dataSource.getRepository(Terms);
    const gradesRepo = dataSource.getRepository(Grades);

    const existingStudent = await studentsRepo.findOne({
      where: { studentId: seedData.student.studentId },
    });

    if (!existingStudent) {
      throw new Error('Seed student missing for reports tests');
    }
    student = existingStudent;

    terms = await Promise.all(
      ['P1', 'P2', 'P3', 'P4'].map((name, index) =>
        termsRepo.save(
          termsRepo.create({
            schoolYearId: seedData.schoolYear.schoolYearId,
            name,
            startDate: `2025-0${index + 1}-01`,
            endDate: `2025-0${index + 1}-28`,
            sortOrder: index + 1,
            isFinal: false,
          }),
        ),
      ),
    );

    const marks = [5, 4, 3, 1];
    for (let i = 0; i < terms.length; i++) {
      await gradesRepo.save(
        gradesRepo.create({
          studentId: student.studentId,
          courseId: seedData.course.courseId,
          termId: terms[i].termId,
          mark: marks[i],
        }),
      );
    }
  }

  async function createAndLoginOutsiderTeacher(): Promise<string> {
    const usersRepo = dataSource.getRepository(Users);
    const uniqueId = String(820000000 + (Date.now() % 100000));
    const outsider = await usersRepo.save(
      usersRepo.create({
        nationalId: uniqueId,
        username: `teach-${uniqueId}`,
        passwordHash: await bcrypt.hash('Teach#999', 10),
        role: 'teacher',
        isActive: true,
      }),
    );
    return login(app, {
      nationalId: outsider.nationalId,
      password: 'Teach#999',
    });
  }

  async function setupPlanillaDocuments(): Promise<void> {
    const planillaRepo = dataSource.getRepository(PlanillaSheets);
    const studentsRepo = dataSource.getRepository(Students);
    const enrollmentsRepo = dataSource.getRepository(Enrollments);

    planillaGroupCode = `${seedData.classGroup.gradeLevel}${seedData.classGroup.section}`;

    const secondStudent = await studentsRepo.save(
      studentsRepo.create({
        nationalId: `e2e-second-${seedData.schoolYear.schoolYearId}`,
        firstName: 'Second',
        lastName: 'Student',
        guardianName: 'Guardian Two',
        guardianRelationship: 'Parent',
        guardianPhone: '555987654',
        isActive: true,
      }),
    );

    await enrollmentsRepo.save(
      enrollmentsRepo.create({
        studentId: secondStudent.studentId,
        classGroupId: seedData.classGroup.classGroupId,
        gradeLevel: seedData.classGroup.gradeLevel,
        schoolYearId: seedData.schoolYear.schoolYearId,
        active: true,
      }),
    );

    const existingPlanilla = await planillaRepo.findOne({
      where: {
        schoolYearId: seedData.schoolYear.schoolYearId,
        groupCode: planillaGroupCode,
        templateKey: 'iedrc-secondary-v1',
      },
    });

    const entity = existingPlanilla ?? planillaRepo.create();
    entity.schoolYearId = seedData.schoolYear.schoolYearId;
    entity.classGroupId = seedData.classGroup.classGroupId;
    entity.gradeLevel = seedData.classGroup.gradeLevel;
    entity.section = seedData.classGroup.section;
    entity.groupCode = planillaGroupCode;
    entity.sourceSheet = 'E2E';
    entity.sourceFileName = null;
    entity.templateKey = 'iedrc-secondary-v1';
    entity.title = `Planilla ${planillaGroupCode}`;
    entity.metadata = {
      subjectName: 'Mathematics E2E',
      teacherName: 'Teacher E2E',
      periodLabel: 'P1-P4',
    };
    entity.columns = [];
    entity.rows = [
      {
        rowId: 'row-1',
        order: 1,
        studentId: Number(student.studentId),
        nationalId: student.nationalId,
        studentName: `${student.firstName} ${student.lastName}`,
        cells: {
          proc_1: 'A',
          cog_1: 'S',
          act_1: 'B',
          proc_2: 'S',
          cog_2: 'A',
          act_2: 'A',
          proc_3: 'B',
          cog_3: 'A',
          act_3: 'A',
          proc_4: 'S',
          cog_4: 'A',
          act_4: 'B',
        },
      },
      {
        rowId: 'row-2',
        order: 2,
        studentId: Number(secondStudent.studentId),
        nationalId: secondStudent.nationalId,
        studentName: `${secondStudent.firstName} ${secondStudent.lastName}`,
        cells: {
          proc_1: 'A',
          cog_1: 'J',
          act_1: 'A',
          proc_2: 'A',
          cog_2: 'A',
          act_2: 'A',
          proc_3: 'A',
          cog_3: 'A',
          act_3: 'A',
          proc_4: 'A',
          cog_4: 'A',
          act_4: 'A',
        },
      },
    ];
    entity.isActive = true;
    entity.importedById = seedData.users.coordinator.nationalId;
    entity.importClosedAt = new Date();

    await planillaRepo.save(entity);
  }

  it('generates active-student certificate with incremental print ids', async () => {
    await dataSource.query(`SELECT setval('print_generation_seq', 1, false);`);

    const payload = {
      studentId: Number(student.studentId),
      schoolYearId: Number(seedData.schoolYear.schoolYearId),
    };

    const response1 = await request(app.getHttpServer())
      .post('/reports/certificates/active-student')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send(payload)
      .expect(201);

    const response2 = await request(app.getHttpServer())
      .post('/reports/certificates/active-student')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send(payload)
      .expect(201);

    expect(response2.body.printId).toBe(response1.body.printId + 1);
  });

  it('enforces teacher scoping on term grade reports', async () => {
    const termId = Number(terms[0].termId);
    const studentId = Number(student.studentId);
    const courseId = Number(seedData.course.courseId);

    const success = await request(app.getHttpServer())
      .get('/reports/grades/term')
      .query({ studentId, courseId, termId })
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200);

    expect(success.body.printId).toBeGreaterThan(0);

    await request(app.getHttpServer())
      .get('/reports/grades/term')
      .query({ studentId, courseId, termId })
      .set('Authorization', `Bearer ${outsiderTeacherToken}`)
      .expect(403);
  });

  it('returns consecutive print ids for term reports', async () => {
    await dataSource.query(`SELECT setval('print_generation_seq', 1, false);`);

    const params = {
      studentId: Number(student.studentId),
      courseId: Number(seedData.course.courseId),
      termId: Number(terms[1].termId),
    };

    const first = await request(app.getHttpServer())
      .get('/reports/grades/term')
      .query(params)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .expect(200);

    const second = await request(app.getHttpServer())
      .get('/reports/grades/term')
      .query(params)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .expect(200);

    expect(second.body.printId).toBe(first.body.printId + 1);
  });

  it('returns final grade summary with correct rounding', async () => {
    const res = await request(app.getHttpServer())
      .get('/reports/grades/final')
      .query({
        studentId: Number(student.studentId),
        courseId: Number(seedData.course.courseId),
        schoolYearId: Number(seedData.schoolYear.schoolYearId),
      })
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .expect(200);

    expect(res.body.summary.finalLetter).toBe('B');
    expect(res.body.summary.termMarks).toEqual([5, 4, 3, 1]);
    expect(res.body.printId).toBeGreaterThan(0);
  });

  it('returns a student record document from planilla grades for registrar', async () => {
    const res = await request(app.getHttpServer())
      .get('/reports/documents/student-record')
      .query({
        studentId: Number(student.studentId),
        schoolYearId: Number(seedData.schoolYear.schoolYearId),
        periods: '1,2,3',
      })
      .set('Authorization', `Bearer ${registrarToken}`)
      .expect(200);

    expect(res.body.printId).toBeGreaterThan(0);
    expect(res.body.student.fullName).toBe('Seed Student');
    expect(res.body.student.groupCode).toBe(planillaGroupCode);
    expect(res.body.periods).toEqual([1, 2, 3]);
    expect(res.body.subjects).toHaveLength(1);
    expect(res.body.subjects[0].subjectName).toBe('Mathematics E2E');
    expect(res.body.subjects[0].periods[0]).toMatchObject({
      period: 1,
      procedural: 'A',
      cognitive: 'S',
      attitudinal: 'B',
    });
  });

  it('returns promotion eligibility from planilla grades for registrar', async () => {
    const res = await request(app.getHttpServer())
      .get('/reports/documents/eligibility')
      .query({
        schoolYearId: Number(seedData.schoolYear.schoolYearId),
        gradeLevel: seedData.classGroup.gradeLevel,
      })
      .set('Authorization', `Bearer ${registrarToken}`)
      .expect(200);

    expect(res.body.documentType).toBe('promotion');
    expect(res.body.eligibleCount).toBe(1);
    expect(res.body.totalStudents).toBe(2);
    expect(res.body.statement).toContain(
      `grade ${seedData.classGroup.gradeLevel + 1}`,
    );
    expect(res.body.students).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fullName: 'Seed Student',
          eligible: true,
        }),
        expect.objectContaining({
          fullName: 'Second Student',
          eligible: false,
          failingSubjects: ['Mathematics E2E'],
        }),
      ]),
    );
  });
});
