import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DbErrorMapper } from '../shared/db-error.mapper';
import { SubjectsRepository } from '../subjects/subjects.repository';
import { UsersRepository } from '../users/users.repository';
import { TeacherSubjectsRepository } from './teacher_subjects.repository';
import { TeacherSubjects } from './teacher_subjects.entity';
import { CreateTeacherSubjectDto } from './dto/create-teacher-subject.dto';
import { TeacherSubjectsQueryDto } from './dto/teacher-subjects-query.dto';

@Injectable()
export class TeacherSubjectsService {
  constructor(
    private readonly repository: TeacherSubjectsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly subjectsRepository: SubjectsRepository,
  ) {}

  async findAll(query: TeacherSubjectsQueryDto): Promise<TeacherSubjects[]> {
    const qb = this.repository
      .createQueryBuilder('teacherSubjects')
      .leftJoinAndSelect('teacherSubjects.subject', 'subject')
      .leftJoinAndSelect('teacherSubjects.teacher', 'teacher')
      .orderBy('teacherSubjects.created_at', 'DESC');

    if (query.teacherId) {
      qb.andWhere('teacherSubjects.teacherId = :teacherId', {
        teacherId: query.teacherId,
      });
    }

    if (query.subjectId) {
      qb.andWhere('teacherSubjects.subjectId = :subjectId', {
        subjectId: query.subjectId.toString(),
      });
    }

    return qb.getMany();
  }

  async findOne(id: number): Promise<TeacherSubjects> {
    const entity = await this.repository.findOne({
      where: { teacherSubjectId: id.toString() },
      relations: { subject: true, teacher: true },
    });

    if (!entity) {
      throw new NotFoundException('Teacher subject relation not found');
    }

    return entity;
  }

  async create(dto: CreateTeacherSubjectDto): Promise<TeacherSubjects> {
    const teacher = await this.usersRepository.findOne({
      where: { nationalId: dto.teacherId },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    if (teacher.role !== 'teacher') {
      throw new BadRequestException('User is not a teacher');
    }

    const subject = await this.subjectsRepository.findOne({
      where: { subjectId: dto.subjectId.toString() },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    const entity = this.repository.create({
      teacherId: teacher.nationalId,
      subjectId: subject.subjectId,
    });

    try {
      return await this.repository.save(entity);
    } catch (error) {
      DbErrorMapper.throwConflict(
        error,
        'Teacher is already linked to this subject',
      );
    }
  }

  async remove(id: number): Promise<{ deleted: true }> {
    const entity = await this.findOne(id);
    await this.repository.remove(entity);
    return { deleted: true };
  }
}
