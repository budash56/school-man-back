import { ConflictException } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsRepository } from './students.repository';
import { CreateStudentDto } from './dto/create-student.dto';

type MockedStudentsRepository = Partial<
  Record<keyof StudentsRepository, jest.Mock>
>;

describe('StudentsService', () => {
  let service: StudentsService;
  let repository: StudentsRepository & MockedStudentsRepository;

  const createDto: CreateStudentDto = {
    nationalId: 'CC-1234567',
    firstName: 'Juana',
    lastName: 'Gomez',
    guardianName: 'Maria Gomez',
    guardianRelationship: 'Mother',
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

    service = new StudentsService(repository);
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

  it('soft deletes a student by toggling deletedAt/isActive', async () => {
    const student = { studentId: '1', deletedAt: null, isActive: true };
    (repository.findOne as jest.Mock).mockResolvedValue(student);

    await service.remove(1);

    expect(student.deletedAt).toBeInstanceOf(Date);
    expect(student.isActive).toBe(false);
    expect(repository.save).toHaveBeenCalledWith(student);
  });

  it('restores a soft-deleted student', async () => {
    const student = {
      studentId: '2',
      deletedAt: new Date(),
      isActive: false,
    };
    (repository.findOne as jest.Mock).mockResolvedValue(student);

    await service.restore(2);

    expect(student.deletedAt).toBeNull();
    expect(student.isActive).toBe(true);
    expect(repository.save).toHaveBeenCalledWith(student);
  });
});
