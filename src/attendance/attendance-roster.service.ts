import { Injectable } from '@nestjs/common';
import { EnrollmentsRepository } from '../enrollments/enrollments.repository';

@Injectable()
export class AttendanceRosterService {
  constructor(private readonly enrollmentsRepository: EnrollmentsRepository) {}

  async buildRoster(classGroupId: number, date: string) {
    const roster = await this.enrollmentsRepository
      .createQueryBuilder('enrollment')
      .innerJoinAndSelect('enrollment.student', 'student')
      .innerJoin('enrollment.schoolYear', 'schoolYear')
      .where('enrollment.classGroupId = :classGroupId', {
        classGroupId: classGroupId.toString(),
      })
      .andWhere('enrollment.active = true')
      .andWhere('student.deletedAt IS NULL')
      .andWhere(':targetDate BETWEEN schoolYear.yearStart AND schoolYear.yearEnd', {
        targetDate: date,
      })
      .orderBy('student.lastName', 'ASC')
      .addOrderBy('student.firstName', 'ASC')
      .getMany();

    return {
      classGroupId,
      date,
      students: roster.map((enrollment) => ({
        studentId: Number(enrollment.studentId),
        firstName: enrollment.student?.firstName ?? null,
        lastName: enrollment.student?.lastName ?? null,
      })),
    };
  }
}
