import { TimetableGeneratorService } from './timetable-generator.service';
import { CoursesRepository } from '../courses/courses.repository';
import { TimetableSlotRepository } from '../timetable_slots/timetable_slots.repository';
import { TimetableAssignmentsRepository } from '../timetable_assignments/timetable_assignments.repository';
import { TimetableAssignmentsService } from '../timetable_assignments/timetable_assignments.service';
import { GenerateTimetableDto } from './dto/generate-timetable.dto';

const sampleCourse = {
  courseId: '1',
  classGroupId: '10',
  teacherId: 'T-1',
  courseInstance: {
    courseInstanceId: '11',
    weeklyHours: 2,
    courseName: 'Math',
    schoolYearId: '2025',
  },
  classGroup: {
    classGroupId: '10',
    gradeLevel: 5,
    section: '01',
  },
};

const slots = [
  {
    slotId: 1,
    dayOfWeek: 1,
    startTime: '08:00:00',
    endTime: '08:45:00',
    durationMinutes: 45,
  },
  {
    slotId: 2,
    dayOfWeek: 1,
    startTime: '09:00:00',
    endTime: '09:45:00',
    durationMinutes: 45,
  },
];

describe('TimetableGeneratorService', () => {
  let service: TimetableGeneratorService;
  let coursesRepository: jest.Mocked<CoursesRepository>;
  let slotRepository: jest.Mocked<TimetableSlotRepository>;
  let assignmentsRepository: jest.Mocked<TimetableAssignmentsRepository>;
  let assignmentsService: jest.Mocked<TimetableAssignmentsService>;
  let coursesQueryBuilder: any;

  const criteria: GenerateTimetableDto = {
    schoolYearId: 2025,
    teacherWeeklyHourCap: 5,
    division: 'elementary',
  };

  beforeEach(() => {
    coursesRepository = {
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<CoursesRepository>;

    slotRepository = {
      find: jest.fn(),
    } as unknown as jest.Mocked<TimetableSlotRepository>;

    assignmentsRepository = {
      find: jest.fn(),
    } as unknown as jest.Mocked<TimetableAssignmentsRepository>;

    assignmentsService = {
      create: jest.fn(),
    } as unknown as jest.Mocked<TimetableAssignmentsService>;

    service = new TimetableGeneratorService(
      coursesRepository,
      slotRepository,
      assignmentsRepository,
      assignmentsService,
    );

    coursesQueryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };
    (coursesRepository.createQueryBuilder as jest.Mock).mockReturnValue(
      coursesQueryBuilder,
    );

    (coursesRepository.find as jest.Mock).mockResolvedValue([sampleCourse]);
    (slotRepository.find as jest.Mock).mockResolvedValue(slots);
    (assignmentsRepository.find as jest.Mock).mockResolvedValue([]);
  });

  it('generates assignments when slots are available', async () => {
    const preview = await service.preview(criteria);

    expect(preview.assignments).toHaveLength(2);
    expect(preview.unassignedSessions).toHaveLength(0);
    expect(preview.assignments[0]).toMatchObject({
      courseId: 1,
      classGroupId: 10,
      teacherId: 'T-1',
      slotId: 1,
    });
  });

  it('respects teacher shift constraints', async () => {
    (slotRepository.find as jest.Mock).mockResolvedValue([
      {
        slotId: 3,
        dayOfWeek: 2,
        startTime: '14:00:00',
        endTime: '14:45:00',
        durationMinutes: 45,
      },
    ]);

    const preview = await service.preview({
      ...criteria,
      teacherConstraints: [
        { teacherId: 'T-1', preferredShift: 'morning' },
      ],
    });

    expect(preview.assignments).toHaveLength(0);
    expect(preview.unassignedSessions).toHaveLength(2);
    expect(
      preview.unassignedSessions.every(
        (item) => item.reason === 'NO_SLOT_AVAILABLE',
      ),
    ).toBe(true);
  });

  it('persists previewed assignments when apply is invoked', async () => {
    (assignmentsService.create as jest.Mock).mockResolvedValue({
      assignment: { assignmentId: '1' },
      warnings: [],
    });

    const response = await service.apply(criteria, {
      nationalId: 'admin',
      username: 'admin',
      role: 'admin',
      firstName: null,
      lastName: null,
      email: null,
      phone: null,
      mustChangePassword: false,
    });

    expect(assignmentsService.create).toHaveBeenCalledTimes(2);
    expect(response.persistedAssignments).toHaveLength(2);
    expect(response.failedToPersist).toHaveLength(0);
  });

  it('throws when teacher capacity is insufficient', async () => {
    (coursesQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([
      {
        gradeLevel: 6,
        subjectCode: 'ENG-SEC',
        subjectName: 'English',
        weeklyHours: 4,
        sections: 5,
        teacherCount: 1,
      },
    ]);

    await expect(service.preview(criteria)).rejects.toMatchObject({
      response: expect.objectContaining({
        message: 'insufficientTeacherCapacity',
      }),
    });
  });

  it('spreads sessions across days when maxSessionsPerDayDefault is set', async () => {
    (slotRepository.find as jest.Mock).mockResolvedValue([
      {
        slotId: 1,
        dayOfWeek: 1,
        startTime: '08:00:00',
        endTime: '08:45:00',
        durationMinutes: 45,
      },
      {
        slotId: 2,
        dayOfWeek: 1,
        startTime: '09:00:00',
        endTime: '09:45:00',
        durationMinutes: 45,
      },
      {
        slotId: 3,
        dayOfWeek: 2,
        startTime: '08:00:00',
        endTime: '08:45:00',
        durationMinutes: 45,
      },
      {
        slotId: 4,
        dayOfWeek: 2,
        startTime: '09:00:00',
        endTime: '09:45:00',
        durationMinutes: 45,
      },
    ]);

    const preview = await service.preview({
      ...criteria,
      balanceAcrossDays: true,
      maxSessionsPerDayDefault: 1,
    });

    expect(preview.unassignedSessions).toHaveLength(0);
    expect(preview.assignments).toHaveLength(2);
    const dayCounts = preview.assignments.reduce((acc, assignment) => {
      acc.set(
        assignment.dayOfWeek,
        (acc.get(assignment.dayOfWeek) ?? 0) + 1,
      );
      return acc;
    }, new Map<number, number>());
    expect(dayCounts.get(1)).toBe(1);
    expect(dayCounts.get(2)).toBe(1);
  });

  it('avoids consecutive sessions of the same subject when configured', async () => {
    (slotRepository.find as jest.Mock).mockResolvedValue([
      {
        slotId: 1,
        dayOfWeek: 1,
        startTime: '08:00:00',
        endTime: '08:45:00',
        durationMinutes: 45,
      },
      {
        slotId: 2,
        dayOfWeek: 1,
        startTime: '08:45:00',
        endTime: '09:30:00',
        durationMinutes: 45,
      },
      {
        slotId: 3,
        dayOfWeek: 1,
        startTime: '09:30:00',
        endTime: '10:15:00',
        durationMinutes: 45,
      },
    ]);

    const preview = await service.preview({
      ...criteria,
      avoidConsecutiveSameSubject: true,
    });

    expect(preview.unassignedSessions).toHaveLength(0);
    expect(preview.assignments).toHaveLength(2);
    const slotOrder = new Map<number, number>([
      [1, 0],
      [2, 1],
      [3, 2],
    ]);
    const indices = preview.assignments
      .map((assignment) => slotOrder.get(assignment.slotId) ?? 0)
      .sort((a, b) => a - b);
    expect(indices[1] - indices[0]).toBeGreaterThan(1);
  });

  it('skips blocked slots when blockedSlots are provided', async () => {
    const oneHourCourse = {
      ...sampleCourse,
      courseInstance: {
        ...sampleCourse.courseInstance,
        weeklyHours: 1,
      },
    };
    (coursesRepository.find as jest.Mock).mockResolvedValue([oneHourCourse]);
    (slotRepository.find as jest.Mock).mockResolvedValue([
      {
        slotId: 1,
        dayOfWeek: 1,
        startTime: '08:00:00',
        endTime: '08:45:00',
        durationMinutes: 45,
      },
      {
        slotId: 2,
        dayOfWeek: 1,
        startTime: '09:00:00',
        endTime: '09:45:00',
        durationMinutes: 45,
      },
    ]);

    const preview = await service.preview({
      ...criteria,
      blockedSlots: [
        {
          dayOfWeek: 1,
          startTime: '08:00',
          endTime: '08:45',
        },
      ],
    });

    expect(preview.unassignedSessions).toHaveLength(0);
    expect(preview.assignments).toHaveLength(1);
    expect(preview.assignments[0].slotId).toBe(2);
  });

  it('balances sessions across Monday/Tuesday with no teacher repeats and correct weekly hours', async () => {
    const courses = ['A', 'B', 'C'].map((section, index) => ({
      courseId: String(index + 1),
      classGroupId: String(100 + index),
      teacherId: `T-${index + 1}`,
      courseInstance: {
        courseInstanceId: String(11 + index),
        weeklyHours: 2,
        courseName: `Math-${section}`,
        schoolYearId: '2025',
      },
      classGroup: {
        classGroupId: String(100 + index),
        gradeLevel: 5,
        section,
      },
    }));

    (coursesRepository.find as jest.Mock).mockResolvedValue(courses);
    (slotRepository.find as jest.Mock).mockResolvedValue([
      {
        slotId: 1,
        dayOfWeek: 1,
        startTime: '08:00:00',
        endTime: '08:45:00',
        durationMinutes: 45,
      },
      {
        slotId: 2,
        dayOfWeek: 2,
        startTime: '08:00:00',
        endTime: '08:45:00',
        durationMinutes: 45,
      },
    ]);
    (assignmentsRepository.find as jest.Mock).mockResolvedValue([]);

    // TODO: If you need a real "break at B" slot, the generator needs a
    //       concept of blocked/break slots. This test models the break by
    //       only providing one slot per day.

    const preview = await service.preview(criteria);

    expect(preview.unassignedSessions).toHaveLength(0);
    expect(preview.assignments).toHaveLength(6);

    const byClassGroup = new Map<number, number>();
    const byCourse = new Map<number, number>();
    const byDay = new Map<number, number>();
    const slotTeachers = new Map<number, Set<string>>();

    for (const assignment of preview.assignments) {
      byClassGroup.set(
        assignment.classGroupId,
        (byClassGroup.get(assignment.classGroupId) ?? 0) + 1,
      );
      byCourse.set(
        assignment.courseId,
        (byCourse.get(assignment.courseId) ?? 0) + 1,
      );
      byDay.set(
        assignment.dayOfWeek,
        (byDay.get(assignment.dayOfWeek) ?? 0) + 1,
      );

      const teacherSet = slotTeachers.get(assignment.slotId) ?? new Set();
      teacherSet.add(assignment.teacherId);
      slotTeachers.set(assignment.slotId, teacherSet);
    }

    // Each class group should get exactly 2 sessions (weeklyHours = 2)
    for (const course of courses) {
      expect(byClassGroup.get(Number(course.classGroupId))).toBe(2);
      expect(byCourse.get(Number(course.courseId))).toBe(2);
    }

    // Same number of classes on Monday and Tuesday (K = 3)
    expect(byDay.get(1)).toBe(3);
    expect(byDay.get(2)).toBe(3);

    // No teacher is repeated in the same slot
    for (const assignment of preview.assignments) {
      const teachersInSlot = slotTeachers.get(assignment.slotId) ?? new Set();
      const teachersCount = preview.assignments.filter(
        (item) => item.slotId === assignment.slotId,
      ).length;
      expect(teachersInSlot.size).toBe(teachersCount);
    }
  });
});
