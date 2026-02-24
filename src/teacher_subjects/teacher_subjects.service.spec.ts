import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TeacherSubjectsService } from './teacher_subjects.service';
import { TeacherSubjectsRepository } from './teacher_subjects.repository';
import { UsersRepository } from '../users/users.repository';
import { SubjectsRepository } from '../subjects/subjects.repository';
import { CreateTeacherSubjectDto } from './dto/create-teacher-subject.dto';

const createRepo = <T>() => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
}) as unknown as T;

describe('TeacherSubjectsService', () => {
  let service: TeacherSubjectsService;
  let repository: TeacherSubjectsRepository;
  let usersRepository: UsersRepository;
  let subjectsRepository: SubjectsRepository;

  const createDto: CreateTeacherSubjectDto = {
    teacherId: '199001011234',
    subjectId: 12,
  };

  beforeEach(() => {
    repository = createRepo<TeacherSubjectsRepository>();
    usersRepository = createRepo<UsersRepository>();
    subjectsRepository = createRepo<SubjectsRepository>();

    service = new TeacherSubjectsService(
      repository,
      usersRepository,
      subjectsRepository,
    );
  });

  it('throws NotFoundException when teacher is missing', async () => {
    (usersRepository.findOne as jest.Mock).mockResolvedValue(null);

    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws BadRequestException when user is not a teacher', async () => {
    (usersRepository.findOne as jest.Mock).mockResolvedValue({
      nationalId: '199001011234',
      role: 'admin',
    });

    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('creates teacher-subject relation successfully', async () => {
    (usersRepository.findOne as jest.Mock).mockResolvedValue({
      nationalId: '199001011234',
      role: 'teacher',
    });
    (subjectsRepository.findOne as jest.Mock).mockResolvedValue({
      subjectId: '12',
    });

    const entity = {
      teacherSubjectId: '1',
      teacherId: '199001011234',
      subjectId: '12',
    };
    (repository.create as jest.Mock).mockReturnValue(entity);
    (repository.save as jest.Mock).mockResolvedValue(entity);

    const result = await service.create(createDto);

    expect(repository.create as jest.Mock).toHaveBeenCalled();
    expect(result).toEqual(entity);
  });
});
