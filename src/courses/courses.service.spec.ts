import { ConflictException, ForbiddenException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { CoursesService } from './courses.service';
import { CoursesRepository } from './courses.repository';
import { CourseInstancesRepository } from '../course_instances/course_instances.repository';
import { ClassGroupsRepository } from '../class_groups/class_groups.repository';
import { UsersRepository } from '../users/users.repository';
import { CreateCourseDto } from './dto/create-course.dto';
import { AccessService } from '../auth/access.service';
import { SchoolYearsRepository } from '../school_years/school_years.repository';

type MockedRepository<T> = Partial<Record<keyof T, jest.Mock>>;

describe('CoursesService', () => {
  let service: CoursesService;
  let coursesRepository: CoursesRepository &
    MockedRepository<CoursesRepository>;
  let courseInstancesRepository: CourseInstancesRepository &
    MockedRepository<CourseInstancesRepository>;
  let classGroupsRepository: ClassGroupsRepository &
    MockedRepository<ClassGroupsRepository>;
  let usersRepository: UsersRepository & MockedRepository<UsersRepository>;
  let schoolYearsRepository: SchoolYearsRepository &
    MockedRepository<SchoolYearsRepository>;
  let accessService: {
    courseIdsForTeacher: jest.Mock;
    classGroupIdsForTeacher: jest.Mock;
    isTeacherOfCourse: jest.Mock;
  };

  const createDto: CreateCourseDto = {
    courseInstanceId: 10,
    classGroupId: 20,
    teacherId: 30,
  };

  beforeEach(() => {
    coursesRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as CoursesRepository & MockedRepository<CoursesRepository>;

    courseInstancesRepository = {
      findOne: jest.fn(),
    } as unknown as CourseInstancesRepository &
      MockedRepository<CourseInstancesRepository>;

    classGroupsRepository = {
      findOne: jest.fn(),
    } as unknown as ClassGroupsRepository &
      MockedRepository<ClassGroupsRepository>;

    usersRepository = {
      findOne: jest.fn(),
    } as unknown as UsersRepository & MockedRepository<UsersRepository>;

    schoolYearsRepository = {
      findOne: jest.fn(),
    } as unknown as SchoolYearsRepository &
      MockedRepository<SchoolYearsRepository>;

    (schoolYearsRepository.findOne as jest.Mock).mockResolvedValue({
      schoolYearId: '3',
      isActive: true,
    });

    accessService = {
      courseIdsForTeacher: jest.fn().mockResolvedValue([]),
      classGroupIdsForTeacher: jest.fn().mockResolvedValue([]),
      isTeacherOfCourse: jest.fn().mockResolvedValue(true),
    };

    service = new CoursesService(
      coursesRepository,
      courseInstancesRepository,
      classGroupsRepository,
      usersRepository,
      accessService as unknown as AccessService,
      schoolYearsRepository,
    );
  });

  it('throws ConflictException when grade levels mismatch', async () => {
    (courseInstancesRepository.findOne as jest.Mock).mockResolvedValue({
      courseInstanceId: '10',
      gradeLevel: 5,
      schoolYearId: '3',
    });
    (classGroupsRepository.findOne as jest.Mock).mockResolvedValue({
      classGroupId: '20',
      gradeLevel: 6,
      section: '01',
      schoolYearId: '3',
    });
    (usersRepository.findOne as jest.Mock).mockResolvedValue({
      nationalId: '30',
      role: 'teacher',
    });

    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('throws ForbiddenException when assigning non-teacher user', async () => {
    (courseInstancesRepository.findOne as jest.Mock).mockResolvedValue({
      courseInstanceId: '10',
      gradeLevel: 5,
      schoolYearId: '3',
    });
    (classGroupsRepository.findOne as jest.Mock).mockResolvedValue({
      classGroupId: '20',
      gradeLevel: 5,
      section: '01',
      schoolYearId: '3',
    });
    (usersRepository.findOne as jest.Mock).mockResolvedValue({
      nationalId: '30',
      role: 'admin',
    });

    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('throws ConflictException on duplicate course assignment', async () => {
    (courseInstancesRepository.findOne as jest.Mock).mockResolvedValue({
      courseInstanceId: '10',
      gradeLevel: 5,
      schoolYearId: '3',
    });
    (classGroupsRepository.findOne as jest.Mock).mockResolvedValue({
      classGroupId: '20',
      gradeLevel: 5,
      section: '01',
      schoolYearId: '3',
    });
    (usersRepository.findOne as jest.Mock).mockResolvedValue({
      nationalId: '30',
      role: 'teacher',
    });
    (schoolYearsRepository.findOne as jest.Mock).mockResolvedValue({
      schoolYearId: '3',
      isActive: true,
    });
    (coursesRepository.create as jest.Mock).mockReturnValue({});
    (coursesRepository.save as jest.Mock).mockRejectedValue(
      new QueryFailedError('', [], { code: '23505' } as unknown as Error),
    );

    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('throws ConflictException when course and class group school years differ', async () => {
    (courseInstancesRepository.findOne as jest.Mock).mockResolvedValue({
      courseInstanceId: '10',
      gradeLevel: 5,
      schoolYearId: '3',
    });
    (classGroupsRepository.findOne as jest.Mock).mockResolvedValue({
      classGroupId: '20',
      gradeLevel: 5,
      section: '01',
      schoolYearId: '4',
    });
    (usersRepository.findOne as jest.Mock).mockResolvedValue({
      nationalId: '30',
      role: 'teacher',
    });

    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(schoolYearsRepository.findOne).not.toHaveBeenCalled();
  });

  it('throws ConflictException when school year is inactive', async () => {
    (courseInstancesRepository.findOne as jest.Mock).mockResolvedValue({
      courseInstanceId: '10',
      gradeLevel: 5,
      schoolYearId: '3',
    });
    (classGroupsRepository.findOne as jest.Mock).mockResolvedValue({
      classGroupId: '20',
      gradeLevel: 5,
      section: '01',
      schoolYearId: '3',
    });
    (usersRepository.findOne as jest.Mock).mockResolvedValue({
      nationalId: '30',
      role: 'teacher',
    });
    (schoolYearsRepository.findOne as jest.Mock).mockResolvedValue({
      schoolYearId: '3',
      isActive: false,
    });

    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('creates a course and returns summary', async () => {
    const courseInstance = {
      courseInstanceId: '10',
      gradeLevel: 5,
      schoolYearId: '3',
      courseName: 'Mathematics Grade 5',
      subject: { subjectCode: 'MATH', name: 'Mathematics' },
    };
    const classGroup = {
      classGroupId: '20',
      gradeLevel: 5,
      section: '01',
      schoolYearId: '3',
    };
    const teacher = {
      nationalId: '30',
      role: 'teacher',
      firstName: 'Alice',
      lastName: 'Teacher',
    };

    (courseInstancesRepository.findOne as jest.Mock).mockResolvedValue(
      courseInstance,
    );
    (classGroupsRepository.findOne as jest.Mock).mockResolvedValue(classGroup);
    (usersRepository.findOne as jest.Mock).mockResolvedValue(teacher);
    (schoolYearsRepository.findOne as jest.Mock).mockResolvedValue({
      schoolYearId: '3',
      isActive: true,
    });
    (coursesRepository.create as jest.Mock).mockReturnValue({});
    (coursesRepository.save as jest.Mock).mockResolvedValue({ courseId: '55' });
    (coursesRepository.findOne as jest.Mock).mockResolvedValue({
      ...courseInstance,
      ...classGroup,
      ...teacher,
      courseId: '55',
      courseInstanceId: courseInstance.courseInstanceId,
      classGroupId: classGroup.classGroupId,
      teacherId: teacher.nationalId,
      courseInstance,
      classGroup,
      teacher,
    });

    const result = await service.create(createDto);

    expect(result).toMatchObject({
      courseId: 55,
      courseInstanceId: Number(courseInstance.courseInstanceId),
      classGroupId: Number(classGroup.classGroupId),
      teacherId: Number(teacher.nationalId),
      gradeLevel: classGroup.gradeLevel,
      section: classGroup.section,
      subjectCode: courseInstance.subject.subjectCode,
      subjectName: courseInstance.subject.name,
      teacherName: 'Alice Teacher',
    });
  });
});
