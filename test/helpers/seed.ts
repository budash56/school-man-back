import { DataSource, Repository, ObjectLiteral, FindOptionsWhere, DeepPartial } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Users } from '../../src/users/users.entity';
import { SchoolYears } from '../../src/school_years/school_years.entity';
import { ClassGroups } from '../../src/class_groups/class_groups.entity';
import { Classrooms } from '../../src/classrooms/classrooms.entity';
import { SubjectAreas } from '../../src/subject_areas/subject_areas.entity';
import { Subjects } from '../../src/subjects/subjects.entity';
import { CourseInstances } from '../../src/course_instances/course_instances.entity';
import { Courses } from '../../src/courses/courses.entity';
import { Attendance } from '../../src/attendance/attendance.entity';
import { Grades } from '../../src/grades/grades.entity';
import { TimetableAssignments } from '../../src/timetable_assignments/timetable_assignments.entity';
import { Enrollments } from '../../src/enrollments/enrollments.entity';
import { Students } from '../../src/students/students.entity';
import { TimetableSlot } from '../../src/timetable_slots/timetable_slots.entity';

type SeedUserKey = 'admin' | 'coordinator' | 'registrar' | 'teacher';

export type SeedOptions = {
  mode?: 'reuse' | 'wipe';
  tag?: string;
};

export type SeedResult = {
  users: Record<SeedUserKey, { nationalId: string; password: string }>
  schoolYear: SchoolYears;
  classGroup: ClassGroups;
  course: Courses;
  student: Students;
  classroom: Classrooms;
  timetableSlot: TimetableSlot;
  timetableAssignment: TimetableAssignments;
};

const defaultTag = (): string =>
  process.env.E2E_SEED_TAG ??
  `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeTag = (tag: string): string => {
  const cleaned = tag.replace(/[^a-zA-Z0-9]/g, '');
  return cleaned.slice(-8) || `${Date.now()}`;
};

const hashTag = (tag: string): number => {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash << 5) - hash + tag.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const sectionFromTag = (tag: string): string => {
  const value = (hashTag(tag) % 90) + 10;
  return String(value).padStart(2, '0');
};

async function wipe(repo: Repository<ObjectLiteral>): Promise<void> {
  await repo.createQueryBuilder().delete().where('1=1').execute();
}

async function getOrCreate<T extends ObjectLiteral>(
  repo: Repository<T>,
  where: FindOptionsWhere<T>,
  create: DeepPartial<T>,
): Promise<T> {
  const existing = await repo.findOne({ where });
  if (existing) {
    return existing;
  }
  return repo.save(repo.create(create));
}

async function ensureUser(
  usersRepo: Repository<Users>,
  seed: { nationalId: string; username: string; password: string; role: Users['role'] },
): Promise<Users> {
  const passwordHash = await bcrypt.hash(seed.password, 10);
  const existing = await usersRepo.findOne({ where: { nationalId: seed.nationalId } });
  if (!existing) {
    return usersRepo.save(
      usersRepo.create({
        nationalId: seed.nationalId,
        username: seed.username,
        passwordHash,
        role: seed.role,
        isActive: true,
      }),
    );
  }
  existing.username = seed.username;
  existing.passwordHash = passwordHash;
  existing.role = seed.role;
  existing.isActive = true;
  return usersRepo.save(existing);
}

export async function seedBasicData(
  dataSource: DataSource,
  options: SeedOptions = {},
): Promise<SeedResult> {
  const mode = options.mode ?? (process.env.E2E_SEED_MODE === 'wipe' ? 'wipe' : 'reuse');
  const rawTag = options.tag ?? defaultTag();
  const seedTag = normalizeTag(rawTag);
  const section = sectionFromTag(seedTag);

  const attendanceRepo = dataSource.getRepository(Attendance);
  const gradesRepo = dataSource.getRepository(Grades);
  const timetableAssignmentsRepo = dataSource.getRepository(TimetableAssignments);
  const timetableSlotsRepo = dataSource.getRepository(TimetableSlot);
  const coursesRepo = dataSource.getRepository(Courses);
  const courseInstancesRepo = dataSource.getRepository(CourseInstances);
  const enrollmentsRepo = dataSource.getRepository(Enrollments);
  const classGroupsRepo = dataSource.getRepository(ClassGroups);
  const classroomsRepo = dataSource.getRepository(Classrooms);
  const schoolYearsRepo = dataSource.getRepository(SchoolYears);
  const subjectsRepo = dataSource.getRepository(Subjects);
  const subjectAreasRepo = dataSource.getRepository(SubjectAreas);
  const usersRepo = dataSource.getRepository(Users);
  const studentsRepo = dataSource.getRepository(Students);

  if (mode === 'wipe') {
    await wipe(attendanceRepo);
    await wipe(gradesRepo);
    await wipe(timetableAssignmentsRepo);
    await wipe(coursesRepo);
    await wipe(courseInstancesRepo);
    await wipe(enrollmentsRepo);
    await wipe(classGroupsRepo);
    await wipe(classroomsRepo);
    await wipe(schoolYearsRepo);
    await wipe(subjectsRepo);
    await wipe(subjectAreasRepo);
    await wipe(usersRepo);
    await wipe(studentsRepo);
    await wipe(timetableSlotsRepo);
  }

  const idSuffix = String(hashTag(seedTag) % 100000).padStart(5, '0');
  const adminId = `900${idSuffix}`;
  const coordinatorId = `910${idSuffix}`;
  const registrarId = `920${idSuffix}`;
  const teacherId = `800${idSuffix}`;

  const userSeeds: Array<{ key: SeedUserKey; nationalId: string; username: string; password: string; role: Users['role'] }> = [
    {
      key: 'admin',
      nationalId: adminId,
      username: `e2e-admin-${seedTag}`,
      password: 'Admin#123',
      role: 'admin',
    },
    {
      key: 'coordinator',
      nationalId: coordinatorId,
      username: `e2e-coord-${seedTag}`,
      password: 'Coord#123',
      role: 'coordinator',
    },
    {
      key: 'registrar',
      nationalId: registrarId,
      username: `e2e-reg-${seedTag}`,
      password: 'Reg#123',
      role: 'registrar',
    },
    {
      key: 'teacher',
      nationalId: teacherId,
      username: `e2e-teach-${seedTag}`,
      password: 'Teach#123',
      role: 'teacher',
    },
  ];

  const credentials = {} as Record<SeedUserKey, { nationalId: string; password: string }>;
  const usersByKey = {} as Record<SeedUserKey, Users>;

  for (const seed of userSeeds) {
    usersByKey[seed.key] = await ensureUser(usersRepo, seed);
    credentials[seed.key] = {
      nationalId: seed.nationalId,
      password: seed.password,
    };
  }

  const subjectAreaCode = `E2E-${seedTag}`;
  const subjectArea = await getOrCreate(
    subjectAreasRepo,
    { code: subjectAreaCode },
    { name: `E2E Area ${seedTag}`, code: subjectAreaCode },
  );

  const subjectCode = `E2E-MATH-${seedTag}`;
  const subject = await getOrCreate(
    subjectsRepo,
    { subjectCode },
    {
      subjectCode,
      name: `Mathematics ${seedTag}`,
      description: null,
      area: subjectArea,
    },
  );

  const schoolYearName = `E2E-${seedTag}`;
  let schoolYear = await getOrCreate(
    schoolYearsRepo,
    { name: schoolYearName },
    {
      name: schoolYearName,
      yearStart: '2025-01-01',
      yearEnd: '2025-12-31',
      isActive: true,
    },
  );
  if (!schoolYear.isActive) {
    schoolYear = await schoolYearsRepo.save({
      ...schoolYear,
      isActive: true,
    });
  }

  const classroomName = `E2E Room ${seedTag}`;
  const classroom = await getOrCreate(
    classroomsRepo,
    { name: classroomName },
    {
      name: classroomName,
      buildingId: null,
      capacity: 30,
    },
  );

  const classGroup = await getOrCreate(
    classGroupsRepo,
    { schoolYearId: schoolYear.schoolYearId, gradeLevel: 10, section },
    {
      schoolYearId: schoolYear.schoolYearId,
      gradeLevel: 10,
      section,
      classroom,
    },
  );

  const courseCode = `E2E-MATH-${seedTag}`;
  const courseInstance = await getOrCreate(
    courseInstancesRepo,
    { courseCode, schoolYearId: schoolYear.schoolYearId },
    {
      subjectId: subject.subjectId,
      gradeLevel: 10,
      schoolYearId: schoolYear.schoolYearId,
      weeklyHours: 5,
      courseCode,
      courseName: `Mathematics Grade 10 ${seedTag}`,
      description: null,
      isActive: true,
      subject,
      schoolYear,
    },
  );

  const course = await getOrCreate(
    coursesRepo,
    {
      courseInstanceId: courseInstance.courseInstanceId,
      classGroupId: classGroup.classGroupId,
      teacherId: usersByKey.teacher.nationalId,
    },
    {
      courseInstanceId: courseInstance.courseInstanceId,
      classGroupId: classGroup.classGroupId,
      teacherId: usersByKey.teacher.nationalId,
      courseInstance,
      classGroup,
      teacher: usersByKey.teacher,
    },
  );

  const studentNationalId = `e2e-student-${seedTag}`;
  const student = await getOrCreate(
    studentsRepo,
    { nationalId: studentNationalId },
    {
      nationalId: studentNationalId,
      firstName: 'Seed',
      lastName: 'Student',
      guardianName: 'Seed Guardian',
      guardianRelationship: 'Parent',
      guardianPhone: '555123456',
      isActive: true,
    },
  );

  const enrollment = await enrollmentsRepo.findOne({
    where: {
      studentId: student.studentId,
      schoolYearId: schoolYear.schoolYearId,
      active: true,
    },
  });
  if (!enrollment) {
    await enrollmentsRepo.save(
      enrollmentsRepo.create({
        studentId: student.studentId,
        classGroupId: classGroup.classGroupId,
        gradeLevel: classGroup.gradeLevel,
        schoolYearId: schoolYear.schoolYearId,
        active: true,
      }),
    );
  }

  const timetableSlot = await getOrCreate(
    timetableSlotsRepo,
    { dayOfWeek: 1, startTime: '08:00:00', endTime: '08:45:00' },
    {
      dayOfWeek: 1,
      startTime: '08:00:00',
      endTime: '08:45:00',
      durationMinutes: 45,
    },
  );

  const timetableAssignment = await getOrCreate(
    timetableAssignmentsRepo,
    { courseId: course.courseId.toString(), slotId: timetableSlot.slotId.toString() },
    {
      courseId: course.courseId.toString(),
      slotId: timetableSlot.slotId.toString(),
      teacherId: usersByKey.teacher.nationalId,
      classGroupId: classGroup.classGroupId.toString(),
      classroomId: classroom.classroomId.toString(),
    },
  );

  return {
    users: credentials,
    schoolYear,
    classGroup,
    course,
    student,
    classroom,
    timetableSlot,
    timetableAssignment,
  };
}
