import { BadRequestException, ConflictException } from '@nestjs/common';
import { TimetableAssignmentsService } from './timetable_assignments.service';
import { TimetableAssignmentsRepository } from './timetable_assignments.repository';
import { CoursesRepository } from '../courses/courses.repository';
import { SchoolYearsRepository } from '../school_years/school_years.repository';

const createMockQueryBuilder = (count: number) => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getCount: jest.fn().mockResolvedValue(count),
});

describe('TimetableAssignmentsService (conflicts)', () => {
  let service: TimetableAssignmentsService;
  let assignmentsRepository: jest.Mocked<TimetableAssignmentsRepository>;
  let coursesRepository: jest.Mocked<CoursesRepository>;
  let schoolYearsRepository: jest.Mocked<SchoolYearsRepository>;

  beforeEach(() => {
    assignmentsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<TimetableAssignmentsRepository>;

    coursesRepository = {
      findOne: jest.fn().mockResolvedValue({
        courseId: '1',
        courseInstance: { schoolYearId: '1' },
        classGroup: { classGroupId: '10' },
      }),
    } as unknown as jest.Mocked<CoursesRepository>;

    schoolYearsRepository = {
      findOne: jest.fn().mockResolvedValue({ schoolYearId: '1', isActive: true }),
    } as unknown as jest.Mocked<SchoolYearsRepository>;

    service = new TimetableAssignmentsService(
      assignmentsRepository,
      coursesRepository,
      schoolYearsRepository,
    );
  });

  const mockQueryCounts = (...counts: number[]) => {
    const builders = counts.map((count) => createMockQueryBuilder(count));
    (assignmentsRepository.createQueryBuilder as jest.Mock).mockImplementation(
      () => builders.shift() ?? createMockQueryBuilder(0),
    );
  };

  const assertConflict = async (params: Record<string, unknown>, message: string) => {
    await expect(
      (service as any).assertNoConflicts(params),
    ).rejects.toThrow(message);
  };

  describe('assertNoConflicts', () => {
    it('rejects when class group already has slot', async () => {
      mockQueryCounts(1, 0);
      await expect(
        (service as any).assertNoConflicts({
          courseId: 1,
          slotId: 2,
          classGroupId: 3,
        }),
      ).rejects.toThrow(
        'This class group already has an assignment for the selected slot',
      );
    });

    it('rejects when teacher already has slot', async () => {
      mockQueryCounts(1, 0);
      await assertConflict(
        {
          courseId: 1,
          slotId: 2,
          teacherId: 'teacher',
        },
        'Teacher already has an assignment in this slot',
      );
    });

    it('rejects when course already has slot', async () => {
      mockQueryCounts(1);
      await assertConflict(
        {
          courseId: 1,
          slotId: 2,
        },
        'This course already has an assignment for the selected slot',
      );
    });

    it('rejects when classroom already booked', async () => {
      mockQueryCounts(0, 1);
      await assertConflict(
        {
          courseId: 1,
          slotId: 2,
          classroomId: 4,
        },
        'Classroom already has an assignment for this slot',
      );
    });

    it('rejects when teacher already teaches class group in slot', async () => {
      mockQueryCounts(0, 0, 0, 1);
      await assertConflict(
        {
          courseId: 1,
          slotId: 2,
          teacherId: 'teacher',
          classGroupId: 5,
        },
        'This teacher already teaches the class group in the selected slot',
      );
    });
  });

  it('throws BadRequestException when creating without slotId', async () => {
    await expect(
      service.create(
        {
          courseId: 1,
        } as any,
        { role: 'admin' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
