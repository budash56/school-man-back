import { ConflictException, ForbiddenException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { CoursesService } from './courses.service';
import { CoursesRepository } from './courses.repository';
import { CourseInstancesRepository } from '../course_instances/course_instances.repository';
import { ClassGroupsRepository } from '../class_groups/class_groups.repository';
import { UsersRepository } from '../users/users.repository';
import { CreateCourseDto } from './dto/create-course.dto';

type MockedRepository<T> = Partial<Record<keyof T, jest.Mock>>;

describe('CoursesService', () => {
  let service: CoursesService;
  let coursesRepository: CoursesRepository & MockedRepository<CoursesRepository>;
  let courseInstancesRepository: CourseInstancesRepository & MockedRepository<CourseInstancesRepository>;
  let classGroupsRepository: ClassGroupsRepository & MockedRepository<ClassGroupsRepository>;
  let usersRepository: UsersRepository & MockedRepository<UsersRepository>;

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
    } as unknown as CourseInstancesRepository & MockedRepository<CourseInstancesRepository>;

    classGroupsRepository = {
      findOne: jest.fn(),
    } as unknown as ClassGroupsRepository & MockedRepository<ClassGroupsRepository>;

    usersRepository = {
      findOne: jest.fn(),
    } as unknown as UsersRepository & MockedRepository<UsersRepository>;

    service = new CoursesService(
      coursesRepository,
      courseInstancesRepository,
      classGroupsRepository,
      usersRepository,
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
    });
    (usersRepository.findOne as jest.Mock).mockResolvedValue({
      nationalId: '30',
      role: 'teacher',
    });

    await expect(service.create(createDto)).rejects.toBeInstanceOf(ConflictException);
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
    });
    (usersRepository.findOne as jest.Mock).mockResolvedValue({
      nationalId: '30',
      role: 'admin',
    });

    await expect(service.create(createDto)).rejects.toBeInstanceOf(ForbiddenException);
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
    });
    (usersRepository.findOne as jest.Mock).mockResolvedValue({
      nationalId: '30',
      role: 'teacher',
    });
    (coursesRepository.create as jest.Mock).mockReturnValue({});
    (coursesRepository.save as jest.Mock).mockRejectedValue(
      new QueryFailedError('', [], { code: '23505' }),
    );

    await expect(service.create(createDto)).rejects.toBeInstanceOf(ConflictException);
  });
});
