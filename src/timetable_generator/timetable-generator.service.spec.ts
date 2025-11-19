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
});
