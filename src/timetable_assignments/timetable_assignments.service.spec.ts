import { BadRequestException, ConflictException } from '@nestjs/common';
import { TimetableAssignmentsService } from './timetable_assignments.service';
import { TimetableAssignmentsRepository } from './timetable_assignments.repository';
import { CoursesRepository } from '../courses/courses.repository';
import { SchoolYearsRepository } from '../school_years/school_years.repository';
import { EnrollmentsRepository } from '../enrollments/enrollments.repository';
import { ClassroomsRepository } from '../classrooms/classrooms.repository';
import { AccessService } from '../auth/access.service';

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
  let enrollmentsRepository: jest.Mocked<EnrollmentsRepository>;
  let classroomsRepository: jest.Mocked<ClassroomsRepository>;
  let accessService: jest.Mocked<AccessService>;

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

    enrollmentsRepository = {
      count: jest.fn().mockResolvedValue(0),
    } as unknown as jest.Mocked<EnrollmentsRepository>;

    classroomsRepository = {
      findOne: jest.fn().mockResolvedValue({
        classroomId: '2',
        capacity: 30,
      }),
    } as unknown as jest.Mocked<ClassroomsRepository>;

    accessService = {
      classGroupIdsForTeacher: jest.fn().mockResolvedValue([]),
      isTeacherOfCourse: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<AccessService>;

    service = new TimetableAssignmentsService(
      assignmentsRepository,
      coursesRepository,
      schoolYearsRepository,
      enrollmentsRepository,
      classroomsRepository,
      accessService,
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
      mockQueryCounts(1);
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

  it('returns warning when classroom capacity exceeded', async () => {
    mockQueryCounts(0, 0, 0, 0, 0);
    (enrollmentsRepository.count as jest.Mock).mockResolvedValue(35);
    (classroomsRepository.findOne as jest.Mock).mockResolvedValue({
      classroomId: '2',
      capacity: 30,
    });

    (assignmentsRepository.create as jest.Mock).mockReturnValue({});
    (assignmentsRepository.save as jest.Mock).mockResolvedValue({
      assignmentId: '1',
    });

    const result = await service.create(
      {
        courseId: 1,
        slotId: 2,
        classroomId: 2,
      },
      { role: 'admin' },
    );

    expect(result.warnings).toEqual(['CLASSROOM_CAPACITY_EXCEEDED']);
    expect(result.assignment.assignmentId).toBe('1');
  });
});
