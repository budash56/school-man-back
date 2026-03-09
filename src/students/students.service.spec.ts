import { ConflictException } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsRepository } from './students.repository';
import { CreateStudentDto } from './dto/create-student.dto';
import { EnrollmentsRepository } from '../enrollments/enrollments.repository';
import { SchoolYearsRepository } from '../school_years/school_years.repository';
import { GradesRepository } from '../grades/grades.repository';
import { AttendanceRepository } from '../attendance/attendance.repository';
import { ClassGroupsRepository } from '../class_groups/class_groups.repository';

type MockedStudentsRepository = Partial<
  Record<keyof StudentsRepository, jest.Mock>
>;

describe('StudentsService', () => {
  let service: StudentsService;
  let repository: StudentsRepository & MockedStudentsRepository;
  let enrollmentsRepository: jest.Mocked<EnrollmentsRepository>;
  let schoolYearsRepository: jest.Mocked<SchoolYearsRepository>;
  let gradesRepository: jest.Mocked<GradesRepository>;
  let attendanceRepository: jest.Mocked<AttendanceRepository>;
  let classGroupsRepository: jest.Mocked<ClassGroupsRepository>;

  const createDto: CreateStudentDto = {
    nationalId: 'CC-1234567',
    firstName: 'Juana',
    lastName: 'Gomez',
    guardianName: 'Maria Gomez',
    guardianRelationship: 'Madre',
    guardianPhone: '+573001234567',
    dob: '2010-05-15',
    address: 'Calle 123',
  };

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      merge: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as StudentsRepository & MockedStudentsRepository;

    enrollmentsRepository = {
      find: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<EnrollmentsRepository>;

    schoolYearsRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<SchoolYearsRepository>;

    gradesRepository = {
      createQueryBuilder: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<GradesRepository>;

    attendanceRepository = {
      createQueryBuilder: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<AttendanceRepository>;

    classGroupsRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<ClassGroupsRepository>;

    service = new StudentsService(
      repository,
      enrollmentsRepository,
      schoolYearsRepository,
      gradesRepository,
      attendanceRepository,
      classGroupsRepository,
    );
  });

  it('throws ConflictException when creating a student with duplicate nationalId', async () => {
    const savedStudent = { studentId: '1', ...createDto };

    (repository.findOne as jest.Mock).mockResolvedValueOnce(null);
    (repository.create as jest.Mock).mockReturnValueOnce(savedStudent);
    (repository.save as jest.Mock).mockResolvedValueOnce(savedStudent);

    await service.create(createDto);

    (repository.findOne as jest.Mock).mockResolvedValueOnce(savedStudent);

    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
