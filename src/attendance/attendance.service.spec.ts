import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { AttendanceService } from './attendance.service';
import { AttendanceRepository } from './attendance.repository';
import { StudentsRepository } from '../students/students.repository';
import { CoursesRepository } from '../courses/courses.repository';
import { TimetableSlotRepository } from '../timetable_slots/timetable_slots.repository';
import { EnrollmentsRepository } from '../enrollments/enrollments.repository';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { SchoolYearsRepository } from '../school_years/school_years.repository';

type Mocked<T> = Partial<Record<keyof T, jest.Mock>>;

const pgUniqueQueryFailed = () =>
  new QueryFailedError('', [], {
    code: '23505',
    constraint: 'uniq_attendance_student_date_slot',
    detail: 'Key (student_id, date, slot_id)=(1, 2025-02-10, 3) already exists.',
  });

describe('AttendanceService', () => {
  let service: AttendanceService;
  let attendanceRepository: AttendanceRepository & Mocked<AttendanceRepository>;
  let studentsRepository: StudentsRepository & Mocked<StudentsRepository>;
  let coursesRepository: CoursesRepository & Mocked<CoursesRepository>;
  let timetableSlotRepository: TimetableSlotRepository & Mocked<TimetableSlotRepository>;
  let enrollmentsRepository: EnrollmentsRepository & Mocked<EnrollmentsRepository>;
  let schoolYearsRepository: SchoolYearsRepository & Mocked<SchoolYearsRepository>;

  const baseCreateDto: CreateAttendanceDto = {
    studentId: 1,
    courseId: 5,
    slotId: 3,
    date: '2025-02-10',
    status: 'A',
  };

  beforeEach(() => {
    attendanceRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
      merge: jest.fn(),
    } as unknown as AttendanceRepository & Mocked<AttendanceRepository>;

    studentsRepository = {
      findOne: jest.fn(),
    } as unknown as StudentsRepository & Mocked<StudentsRepository>;

    coursesRepository = {
      findOne: jest.fn(),
    } as unknown as CoursesRepository & Mocked<CoursesRepository>;

    timetableSlotRepository = {
      findOne: jest.fn(),
    } as unknown as TimetableSlotRepository & Mocked<TimetableSlotRepository>;

    enrollmentsRepository = {
      findOne: jest.fn(),
    } as unknown as EnrollmentsRepository & Mocked<EnrollmentsRepository>;

    schoolYearsRepository = {
      findOne: jest.fn().mockResolvedValue({ schoolYearId: '99', isActive: true }),
    } as unknown as SchoolYearsRepository & Mocked<SchoolYearsRepository>;

    (studentsRepository.findOne as jest.Mock).mockResolvedValue({ studentId: '1' });
    (coursesRepository.findOne as jest.Mock).mockResolvedValue({
      courseId: '5',
      classGroup: { classGroupId: '20' },
      courseInstance: { schoolYearId: '99' },
      teacher: { nationalId: '999' },
    });
    (timetableSlotRepository.findOne as jest.Mock).mockResolvedValue({
      slotId: 3,
      dayOfWeek: 1,
    });
    (enrollmentsRepository.findOne as jest.Mock).mockResolvedValue({
      enrollmentId: '1',
    });

    service = new AttendanceService(
      attendanceRepository,
      studentsRepository,
      coursesRepository,
      timetableSlotRepository,
      enrollmentsRepository,
      schoolYearsRepository,
    );
  });

  it('throws BadRequestException when slot weekday does not match attendance date', async () => {
    (timetableSlotRepository.findOne as jest.Mock).mockResolvedValueOnce({
      slotId: 3,
      dayOfWeek: 2,
    });

    await expect(
      service.create(baseCreateDto, { userId: 1, nationalId: 'admin-seed', role: 'admin' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws ConflictException on duplicate attendance for student/date/slot', async () => {
    (attendanceRepository.create as jest.Mock).mockReturnValue({});
    (attendanceRepository.save as jest.Mock).mockRejectedValue(pgUniqueQueryFailed());

    await expect(
      service.create(baseCreateDto, { userId: 1, nationalId: 'admin-seed', role: 'admin' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws ForbiddenException when non recorder tries to excuse absence', async () => {
    (attendanceRepository.findOne as jest.Mock).mockResolvedValue({
      attendanceId: '10',
      studentId: '1',
      courseId: '5',
      slotId: '3',
      date: '2025-02-10',
      status: 'A',
      recordedBy: { nationalId: '999' },
      reasonNote: null,
      excusedAt: null,
    });

    const dto: UpdateAttendanceDto = {
      status: 'AE',
    };

    await expect(
      service.update(
        10,
        dto,
        { userId: 2, nationalId: 'teacher-123', role: 'teacher' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
