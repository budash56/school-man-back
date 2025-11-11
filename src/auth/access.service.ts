import { Injectable } from '@nestjs/common';
import { CoursesRepository } from '../courses/courses.repository';

@Injectable()
export class AccessService {
  constructor(private readonly coursesRepository: CoursesRepository) {}

  async isTeacherOfCourse(userId: number, courseId: number): Promise<boolean> {
    const count = await this.coursesRepository
      .createQueryBuilder('course')
      .where('course.teacherId = :teacherId', { teacherId: userId.toString() })
      .andWhere('course.courseId = :courseId', {
        courseId: courseId.toString(),
      })
      .getCount();

    return count > 0;
  }

  async classGroupIdsForTeacher(userId: number): Promise<number[]> {
    const rows = await this.coursesRepository
      .createQueryBuilder('course')
      .select('DISTINCT course.classGroupId', 'classGroupId')
      .where('course.teacherId = :teacherId', { teacherId: userId.toString() })
      .andWhere('course.classGroupId IS NOT NULL')
      .getRawMany<{ classGroupId: string }>();

    return rows
      .map((row) => Number(row.classGroupId))
      .filter((value) => Number.isFinite(value));
  }

  async courseIdsForTeacher(userId: number): Promise<number[]> {
    const rows = await this.coursesRepository
      .createQueryBuilder('course')
      .select('course.courseId', 'courseId')
      .where('course.teacherId = :teacherId', { teacherId: userId.toString() })
      .getRawMany<{ courseId: string }>();

    return rows
      .map((row) => Number(row.courseId))
      .filter((value) => Number.isFinite(value));
  }
}
