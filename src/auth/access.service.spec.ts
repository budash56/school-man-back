import { AccessService } from './access.service';
import { CoursesRepository } from '../courses/courses.repository';

describe('AccessService', () => {
  let service: AccessService;
  let coursesRepository: jest.Mocked<CoursesRepository>;
  let queryBuilder: any;

  beforeEach(() => {
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
      getRawMany: jest.fn(),
    };

    coursesRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as jest.Mocked<CoursesRepository>;

    service = new AccessService(coursesRepository);
  });

  it('determines if teacher owns the course', async () => {
    queryBuilder.getCount.mockResolvedValueOnce(1);

    const result = await service.isTeacherOfCourse(5, 10);

    expect(result).toBe(true);
    expect(queryBuilder.where).toHaveBeenCalledWith('course.teacherId = :teacherId', {
      teacherId: '5',
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('course.courseId = :courseId', {
      courseId: '10',
    });
  });

  it('returns class group ids for teacher', async () => {
    queryBuilder.select.mockReturnThis();
    queryBuilder.getRawMany.mockResolvedValueOnce([{ classGroupId: '1' }, { classGroupId: 'abc' }]);

    const result = await service.classGroupIdsForTeacher(77);

    expect(result).toEqual([1]);
    expect(queryBuilder.where).toHaveBeenCalledWith('course.teacherId = :teacherId', {
      teacherId: '77',
    });
  });

  it('returns course ids for teacher', async () => {
    queryBuilder.select.mockReturnThis();
    queryBuilder.getRawMany.mockResolvedValueOnce([{ courseId: '10' }, { courseId: 'xyz' }]);

    const result = await service.courseIdsForTeacher(9);

    expect(result).toEqual([10]);
  });
});
