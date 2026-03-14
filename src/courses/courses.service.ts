import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClassGroupsRepository } from '../class_groups/class_groups.repository';
import { CourseInstancesRepository } from '../course_instances/course_instances.repository';
import { DbErrorMapper } from '../shared/db-error.mapper';
import { UsersRepository } from '../users/users.repository';
import { Courses } from './courses.entity';
import { CoursesRepository } from './courses.repository';
import { CoursesQueryDto } from './dto/courses-query.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { AccessService } from '../auth/access.service';
import { SchoolYearsRepository } from '../school_years/school_years.repository';

type ActingUser = {
  userId: number;
  role: string;
};

export type CourseSummary = {
  courseId: number;
  courseInstanceId: number;
  classGroupId: number;
  teacherId: string;
  schoolYearId: number;
  gradeLevel: number;
  section: string;
  classGroupCode: string;
  subjectCode: string;
  subjectName: string;
  teacherName: string | null;
  createdAt: Date | null;
};

@Injectable()
export class CoursesService {
  constructor(
    private readonly coursesRepository: CoursesRepository,
    private readonly courseInstancesRepository: CourseInstancesRepository,
    private readonly classGroupsRepository: ClassGroupsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly access: AccessService,
    private readonly schoolYearsRepository: SchoolYearsRepository,
  ) {}

  async findAll(
    query: CoursesQueryDto,
    currentUser?: ActingUser,
  ): Promise<CourseSummary[]> {
    const qb = this.coursesRepository
      .createQueryBuilder('course')
      .innerJoinAndSelect('course.courseInstance', 'courseInstance')
      .innerJoinAndSelect('courseInstance.subject', 'subject')
      .innerJoinAndSelect('course.classGroup', 'classGroup')
      .innerJoinAndSelect('course.teacher', 'teacher');

    if (query.schoolYearId !== undefined) {
      qb.andWhere('courseInstance.schoolYearId = :schoolYearId', {
        schoolYearId: query.schoolYearId.toString(),
      });
    }

    if (query.gradeLevel !== undefined) {
      qb.andWhere('classGroup.gradeLevel = :gradeLevel', {
        gradeLevel: query.gradeLevel,
      });
    }

    if (query.section !== undefined) {
      qb.andWhere('classGroup.section = :section', {
        section: query.section,
      });
    }

    if (query.teacherId !== undefined) {
      qb.andWhere('course.teacherId = :teacherId', {
        teacherId: query.teacherId,
      });
    }

    if (currentUser?.role === 'teacher') {
      const teacherCourseIds = await this.access.courseIdsForTeacher(
        currentUser.userId,
      );

      if (teacherCourseIds.length === 0) {
        return [];
      }

      qb.andWhere('course.courseId IN (:...allowedCourseIds)', {
        allowedCourseIds: teacherCourseIds.map((id) => id.toString()),
      });
    }

    qb.orderBy('courseInstance.courseName', 'ASC').addOrderBy(
      'classGroup.section',
      'ASC',
    );

    const courses = await qb.getMany();
    return courses.map((course) => this.toSummary(course));
  }

  async findOne(id: number): Promise<CourseSummary> {
    const course = await this.coursesRepository.findOne({
      where: { courseId: id.toString() },
      relations: {
        courseInstance: { subject: true },
        classGroup: true,
        teacher: true,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return this.toSummary(course);
  }

  async create(dto: CreateCourseDto): Promise<CourseSummary> {
    const { courseInstance, classGroup, teacher } = await this.resolveRelations(
      dto.courseInstanceId,
      dto.classGroupId,
      dto.teacherId,
    );

    this.assertGradeLevelMatch(
      courseInstance.gradeLevel,
      classGroup.gradeLevel,
    );
    this.assertTeacherRole(teacher.role);
    await this.assertSchoolYearWritable(
      courseInstance.schoolYearId,
      classGroup.schoolYearId,
    );

    const entity = this.coursesRepository.create({
      courseInstanceId: dto.courseInstanceId.toString(),
      classGroupId: dto.classGroupId.toString(),
      teacherId: dto.teacherId,
    });

    try {
      const saved = await this.coursesRepository.save(entity);
      return this.findOne(Number(saved.courseId));
    } catch (error) {
      DbErrorMapper.throwConflict(
        error,
        'A course with this course instance, class group, and teacher already exists',
      );
    }
  }

  async update(id: number, dto: UpdateCourseDto): Promise<CourseSummary> {
    const course = await this.getCourseEntity(id);

    const nextCourseInstanceId =
      dto.courseInstanceId ?? Number(course.courseInstanceId);
    const nextClassGroupId = dto.classGroupId ?? Number(course.classGroupId);
    const nextTeacherId = dto.teacherId ?? course.teacherId;

    const { courseInstance, classGroup, teacher } = await this.resolveRelations(
      nextCourseInstanceId,
      nextClassGroupId,
      nextTeacherId,
    );

    this.assertGradeLevelMatch(
      courseInstance.gradeLevel,
      classGroup.gradeLevel,
    );
    this.assertTeacherRole(teacher.role);
    await this.assertSchoolYearWritable(
      courseInstance.schoolYearId,
      classGroup.schoolYearId,
    );

    course.courseInstanceId = courseInstance.courseInstanceId;
    course.classGroupId = classGroup.classGroupId;
    course.teacherId = teacher.nationalId;
    course.courseInstance = courseInstance;
    course.classGroup = classGroup;
    course.teacher = teacher;

    try {
      const saved = await this.coursesRepository.save(course);
      return this.findOne(Number(saved.courseId));
    } catch (error) {
      DbErrorMapper.throwConflict(
        error,
        'A course with this course instance, class group, and teacher already exists',
      );
    }
  }

  async remove(id: number): Promise<{ deleted: true }> {
    const course = await this.getCourseEntity(id);
    await this.coursesRepository.remove(course);
    return { deleted: true };
  }

  private async getCourseEntity(id: number): Promise<Courses> {
    const course = await this.coursesRepository.findOne({
      where: { courseId: id.toString() },
      relations: {
        courseInstance: true,
        classGroup: true,
        teacher: true,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  private async resolveRelations(
    courseInstanceId: number,
    classGroupId: number,
    teacherId: string,
  ) {
    const courseInstance = await this.courseInstancesRepository.findOne({
      where: { courseInstanceId: courseInstanceId.toString() },
    });

    if (!courseInstance) {
      throw new NotFoundException('Course instance not found');
    }

    const classGroup = await this.classGroupsRepository.findOne({
      where: { classGroupId: classGroupId.toString() },
    });

    if (!classGroup) {
      throw new NotFoundException('Class group not found');
    }

    const teacher = await this.usersRepository.findOne({
      where: { nationalId: teacherId },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return { courseInstance, classGroup, teacher };
  }

  private assertGradeLevelMatch(
    courseInstanceGrade: number,
    classGroupGrade: number,
  ) {
    if (courseInstanceGrade !== classGroupGrade) {
      throw new ConflictException(
        'Course instance grade level must match class group grade level',
      );
    }
  }

  private assertTeacherRole(role: string) {
    if (role !== 'teacher') {
      throw new ForbiddenException('Only teachers can be assigned to courses');
    }
  }

  private async assertSchoolYearWritable(
    courseInstanceYearId: string | null | undefined,
    classGroupYearId: string | null | undefined,
  ): Promise<void> {
    const instanceYear = Number(courseInstanceYearId);
    if (!Number.isFinite(instanceYear)) {
      throw new BadRequestException(
        'Course instance is missing a valid school year',
      );
    }

    const classYear = Number(classGroupYearId);
    if (!Number.isFinite(classYear)) {
      throw new BadRequestException(
        'Class group is missing a valid school year',
      );
    }

    if (instanceYear !== classYear) {
      throw new ConflictException(
        'Course instance and class group must share the same school year',
      );
    }

    const schoolYear = await this.schoolYearsRepository.findOne({
      where: { schoolYearId: instanceYear.toString() },
    });

    if (!schoolYear) {
      throw new NotFoundException('School year not found');
    }

    if (schoolYear.isActive !== true) {
      throw new ConflictException('Past school years are read-only');
    }
  }

  private toSummary(course: Courses): CourseSummary {
    const subject = course.courseInstance?.subject;
    const classGroup = course.classGroup;
    const teacher = course.teacher;

    const teacherName = teacher
      ? [teacher.firstName, teacher.lastName]
          .filter(Boolean)
          .join(' ')
          .trim() || null
      : null;

    return {
      courseId: Number(course.courseId),
      courseInstanceId: Number(course.courseInstanceId),
      classGroupId: Number(course.classGroupId),
      teacherId: course.teacherId,
      schoolYearId: Number(course.courseInstance?.schoolYearId ?? 0),
      gradeLevel:
        classGroup?.gradeLevel ?? course.courseInstance?.gradeLevel ?? 0,
      section: classGroup?.section ?? '',
      classGroupCode: classGroup
        ? `${classGroup.gradeLevel}${classGroup.section}`
        : '',
      subjectCode: subject?.subjectCode ?? '',
      subjectName: subject?.name ?? course.courseInstance?.courseName ?? '',
      teacherName,
      createdAt: course.createdAt ?? null,
    };
  }
}
