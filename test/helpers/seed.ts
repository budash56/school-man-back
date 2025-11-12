import { DataSource, Repository, ObjectLiteral } from 'typeorm';
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

export type SeedResult = {
  users: Record<SeedUserKey, { nationalId: string; password: string }>;
  schoolYear: SchoolYears;
  classGroup: ClassGroups;
  course: Courses;
  student: Students;
  classroom: Classrooms;
  timetableSlot: TimetableSlot;
  timetableAssignment: TimetableAssignments;
};

async function wipe(repo: Repository<ObjectLiteral>): Promise<void> {
  await repo.createQueryBuilder().delete().where('1=1').execute();
}

export async function seedBasicData(
  dataSource: DataSource,
): Promise<SeedResult> {
  const attendanceRepo = dataSource.getRepository(Attendance);
  const gradesRepo = dataSource.getRepository(Grades);
  const timetableAssignmentsRepo =
    dataSource.getRepository(TimetableAssignments);
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

  const userSeeds: Array<{
    key: SeedUserKey;
    nationalId: string;
    username: string;
    password: string;
    role: Users['role'];
  }> = [
    {
      key: 'admin',
      nationalId: 'admin-seed',
      username: 'admin-seed',
      password: 'Admin#123',
      role: 'admin',
    },
    {
      key: 'coordinator',
      nationalId: 'coord-001',
      username: 'coord',
      password: 'Coord#123',
      role: 'coordinator',
    },
    {
      key: 'registrar',
      nationalId: 'reg-001',
      username: 'reg',
      password: 'Reg#123',
      role: 'registrar',
    },
    {
      key: 'teacher',
      nationalId: '800001',
      username: 'teacher',
      password: 'Teach#123',
      role: 'teacher',
    },
  ];

  const credentials = {} as Record<
    SeedUserKey,
    { nationalId: string; password: string }
  >;
  const usersByKey = {} as Record<SeedUserKey, Users>;

  for (const seed of userSeeds) {
    const entity = usersRepo.create({
      nationalId: seed.nationalId,
      username: seed.username,
      passwordHash: await bcrypt.hash(seed.password, 10),
      role: seed.role,
      isActive: true,
    });

    usersByKey[seed.key] = await usersRepo.save(entity);
    credentials[seed.key] = {
      nationalId: seed.nationalId,
      password: seed.password,
    };
  }

  const subjectArea = await subjectAreasRepo.save(
    subjectAreasRepo.create({
      areaId: '1',
      name: 'STEM',
      code: 'STEM',
    }),
  );

  const subject = await subjectsRepo.save(
    subjectsRepo.create({
      subjectId: '1',
      subjectCode: 'MATH-101',
      name: 'Mathematics 101',
      description: null,
      area: subjectArea,
    }),
  );

  const schoolYear = await schoolYearsRepo.save(
    schoolYearsRepo.create({
      schoolYearId: '1',
      name: '2025-2026',
      yearStart: '2025-01-01',
      yearEnd: '2025-12-31',
      isActive: true,
    }),
  );

  const classroom = await classroomsRepo.save(
    classroomsRepo.create({
      classroomId: '1',
      name: 'Room 101',
      building: 'Main',
      capacity: 30,
    }),
  );

  const classGroup = await classGroupsRepo.save(
    classGroupsRepo.create({
      classGroupId: '1',
      schoolYearId: schoolYear.schoolYearId,
      gradeLevel: 10,
      section: '01',
      classroom,
    }),
  );

  const courseInstance = await courseInstancesRepo.save(
    courseInstancesRepo.create({
      courseInstanceId: '1',
      subjectId: subject.subjectId,
      gradeLevel: 10,
      schoolYearId: schoolYear.schoolYearId,
      weeklyHours: 5,
      courseCode: 'MATH-10-A',
      courseName: 'Mathematics Grade 10',
      description: null,
      isActive: true,
      subject,
      schoolYear,
    }),
  );

  const course = await coursesRepo.save(
    coursesRepo.create({
      courseId: '1',
      courseInstanceId: courseInstance.courseInstanceId,
      classGroupId: classGroup.classGroupId,
      teacherId: usersByKey.teacher.nationalId,
      courseInstance,
      classGroup,
      teacher: usersByKey.teacher,
    }),
  );

  const student = await studentsRepo.save(
    studentsRepo.create({
      studentId: '1',
      nationalId: 'seed-student',
      firstName: 'Seed',
      lastName: 'Student',
      guardianName: 'Seed Guardian',
      guardianRelationship: 'Parent',
      guardianPhone: '555123456',
      isActive: true,
    }),
  );

  await enrollmentsRepo.save(
    enrollmentsRepo.create({
      studentId: student.studentId,
      classGroupId: classGroup.classGroupId,
      schoolYearId: schoolYear.schoolYearId,
      active: true,
    }),
  );

  const timetableSlot = await timetableSlotsRepo.save(
    timetableSlotsRepo.create({
      dayOfWeek: 1,
      startTime: '08:00:00',
      endTime: '08:45:00',
      durationMinutes: 45,
    }),
  );

  const timetableAssignment = await timetableAssignmentsRepo.save(
    timetableAssignmentsRepo.create({
      courseId: course.courseId.toString(),
      slotId: timetableSlot.slotId.toString(),
      teacherId: usersByKey.teacher.nationalId,
      classGroupId: classGroup.classGroupId.toString(),
      classroomId: classroom.classroomId.toString(),
    }),
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
