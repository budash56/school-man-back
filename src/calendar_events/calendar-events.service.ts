import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { In } from 'typeorm';
import type { SanitizedUser } from '../auth/auth.types';
import { CoursesRepository } from '../courses/courses.repository';
import { SchoolYearsRepository } from '../school_years/school_years.repository';
import { SubjectAreasRepository } from '../subject_areas/subject_areas.repository';
import { TeacherSubjectsRepository } from '../teacher_subjects/teacher_subjects.repository';
import { UsersRepository } from '../users/users.repository';
import {
  ADMIN_CALENDAR_CATEGORIES,
  ADMIN_COMMUNICATION_VISIBILITY_SCOPES,
  CALENDAR_EVENT_KIND_OPTIONS,
  CALENDAR_EVENT_MUTATE_ROLES,
  CalendarEventCategory,
  CalendarEventVisibilityScope,
  OFFICIAL_CALENDAR_CATEGORIES,
  OFFICIAL_CALENDAR_VISIBILITY_SCOPE,
  TEACHER_CALENDAR_CATEGORIES,
  TEACHER_CALENDAR_VISIBILITY_SCOPE,
} from './calendar-events.constants';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { CalendarEventsQueryDto } from './dto/calendar-events-query.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import { CalendarEvents } from './calendar-events.entity';
import { CalendarEventsRepository } from './calendar-events.repository';

type CalendarEventActor = Pick<SanitizedUser, 'nationalId' | 'role'>;

type CalendarEventResponse = {
  calendarEventId: number;
  schoolYearId: number;
  title: string;
  description: string | null;
  category: CalendarEventCategory;
  kind: string;
  startDate: string;
  endDate: string;
  visibilityScope: CalendarEventVisibilityScope;
  targetTeacherIds: string[];
  targetAreaIds: number[];
  targetClassGroupIds: number[];
  createdById: string | null;
  createdByRole: string | null;
  createdByName: string | null;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  editable: boolean;
};

type NormalizedCalendarEventPayload = {
  schoolYearId: string;
  title: string;
  description: string | null;
  category: CalendarEventCategory;
  kind: string;
  startDate: string;
  endDate: string;
  visibilityScope: CalendarEventVisibilityScope;
  targetTeacherIds: string[];
  targetAreaIds: string[];
  targetClassGroupIds: string[];
};

@Injectable()
export class CalendarEventsService {
  constructor(
    private readonly repository: CalendarEventsRepository,
    private readonly schoolYearsRepository: SchoolYearsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly subjectAreasRepository: SubjectAreasRepository,
    private readonly teacherSubjectsRepository: TeacherSubjectsRepository,
    private readonly coursesRepository: CoursesRepository,
  ) {}

  async findAll(
    query: CalendarEventsQueryDto,
    currentUser: CalendarEventActor,
  ): Promise<CalendarEventResponse[]> {
    const qb = this.repository
      .createQueryBuilder('calendarEvents')
      .leftJoinAndSelect('calendarEvents.createdBy', 'createdBy')
      .where('calendarEvents.isActive = true');

    if (query.schoolYearId !== undefined) {
      qb.andWhere('calendarEvents.schoolYearId = :schoolYearId', {
        schoolYearId: query.schoolYearId.toString(),
      });
    }

    if (query.from) {
      qb.andWhere('calendarEvents.endDate >= :from', { from: query.from });
    }

    if (query.to) {
      qb.andWhere('calendarEvents.startDate <= :to', { to: query.to });
    }

    qb.orderBy('calendarEvents.startDate', 'ASC').addOrderBy(
      'calendarEvents.title',
      'ASC',
    );

    const entities = await qb.getMany();
    const teacherAreaIds =
      currentUser.role === 'teacher'
        ? await this.loadTeacherAreaIds(currentUser.nationalId)
        : new Set<string>();

    return entities
      .filter((entity) => this.canUserViewEvent(entity, currentUser, teacherAreaIds))
      .map((entity) => this.toResponse(entity, currentUser));
  }

  async create(
    dto: CreateCalendarEventDto,
    currentUser: CalendarEventActor,
  ): Promise<CalendarEventResponse> {
    this.assertCanMutate(currentUser.role);

    const normalized = await this.normalizePayload(dto, currentUser);
    const entity = this.repository.create({
      schoolYearId: normalized.schoolYearId,
      title: normalized.title,
      description: normalized.description,
      category: normalized.category,
      kind: normalized.kind,
      startDate: normalized.startDate,
      endDate: normalized.endDate,
      visibilityScope: normalized.visibilityScope,
      targetTeacherIds: normalized.targetTeacherIds,
      targetAreaIds: normalized.targetAreaIds,
      targetClassGroupIds: normalized.targetClassGroupIds,
      createdById: currentUser.nationalId,
      createdByRole: currentUser.role,
      isActive: true,
    });

    const saved = await this.repository.save(entity);
    return this.findOne(Number(saved.calendarEventId), currentUser);
  }

  async findOne(
    id: number,
    currentUser: CalendarEventActor,
  ): Promise<CalendarEventResponse> {
    const entity = await this.getEntity(id);
    const teacherAreaIds =
      currentUser.role === 'teacher'
        ? await this.loadTeacherAreaIds(currentUser.nationalId)
        : new Set<string>();

    if (!this.canUserViewEvent(entity, currentUser, teacherAreaIds)) {
      throw new ForbiddenException('You cannot access this event');
    }

    return this.toResponse(entity, currentUser);
  }

  async update(
    id: number,
    dto: UpdateCalendarEventDto,
    currentUser: CalendarEventActor,
  ): Promise<CalendarEventResponse> {
    this.assertCanMutate(currentUser.role);

    const entity = await this.getEntity(id);
    this.assertCanEditEntity(entity, currentUser);

    const nextPayload = await this.normalizePayload(
      {
        schoolYearId:
          dto.schoolYearId ?? Number(entity.schoolYearId),
        title: dto.title ?? entity.title,
        description:
          dto.description !== undefined ? dto.description : entity.description,
        category:
          (dto.category as CalendarEventCategory | undefined) ??
          (entity.category as CalendarEventCategory),
        kind: dto.kind ?? entity.kind,
        startDate: dto.startDate ?? entity.startDate,
        endDate: dto.endDate ?? entity.endDate,
        visibilityScope:
          (dto.visibilityScope as CalendarEventVisibilityScope | undefined) ??
          (entity.visibilityScope as CalendarEventVisibilityScope),
        targetTeacherIds:
          dto.targetTeacherIds ?? entity.targetTeacherIds ?? [],
        targetAreaIds:
          dto.targetAreaIds ??
          (entity.targetAreaIds ?? []).map((value) => Number(value)),
        targetClassGroupIds:
          dto.targetClassGroupIds ??
          (entity.targetClassGroupIds ?? []).map((value) => Number(value)),
      },
      currentUser,
    );

    entity.schoolYearId = nextPayload.schoolYearId;
    entity.title = nextPayload.title;
    entity.description = nextPayload.description;
    entity.category = nextPayload.category;
    entity.kind = nextPayload.kind;
    entity.startDate = nextPayload.startDate;
    entity.endDate = nextPayload.endDate;
    entity.visibilityScope = nextPayload.visibilityScope;
    entity.targetTeacherIds = nextPayload.targetTeacherIds;
    entity.targetAreaIds = nextPayload.targetAreaIds;
    entity.targetClassGroupIds = nextPayload.targetClassGroupIds;

    await this.repository.save(entity);
    return this.findOne(id, currentUser);
  }

  async remove(
    id: number,
    currentUser: CalendarEventActor,
  ): Promise<{ deleted: true }> {
    this.assertCanMutate(currentUser.role);

    const entity = await this.getEntity(id);
    this.assertCanEditEntity(entity, currentUser);
    await this.repository.remove(entity);
    return { deleted: true };
  }

  private async normalizePayload(
    dto: CreateCalendarEventDto,
    currentUser: CalendarEventActor,
  ): Promise<NormalizedCalendarEventPayload> {
    const schoolYear = await this.schoolYearsRepository.findOne({
      where: { schoolYearId: dto.schoolYearId.toString() },
    });

    if (!schoolYear) {
      throw new NotFoundException('School year not found');
    }

    const startDate = this.normalizeDate(dto.startDate);
    const endDate = this.normalizeDate(dto.endDate);
    this.assertDateRange(startDate, endDate);
    this.assertWithinSchoolYear(
      startDate,
      endDate,
      schoolYear.yearStart,
      schoolYear.yearEnd,
    );

    const title = dto.title.trim();
    if (!title) {
      throw new BadRequestException('Title is required');
    }

    const category = dto.category;
    this.assertKindMatchesCategory(category, dto.kind);

    if (currentUser.role === 'teacher') {
      if (!TEACHER_CALENDAR_CATEGORIES.includes(category)) {
        throw new ForbiddenException(
          'Teachers can only create exam, homework, or custom class events',
        );
      }

      const classGroupIds = this.normalizeStringList(dto.targetClassGroupIds);
      if (classGroupIds.length === 0) {
        throw new BadRequestException(
          'Teachers must select at least one class group',
        );
      }

      const allowedClassGroupIds = await this.loadTeacherClassGroupIds(
        currentUser.nationalId,
        dto.schoolYearId,
      );
      const invalidClassGroupId = classGroupIds.find(
        (classGroupId) => !allowedClassGroupIds.has(classGroupId),
      );

      if (invalidClassGroupId) {
        throw new ForbiddenException(
          'Teachers can only assign events to their own class groups',
        );
      }

      return {
        schoolYearId: dto.schoolYearId.toString(),
        title,
        description: dto.description?.trim() || null,
        category,
        kind: dto.kind,
        startDate,
        endDate,
        visibilityScope: TEACHER_CALENDAR_VISIBILITY_SCOPE,
        targetTeacherIds: [],
        targetAreaIds: [],
        targetClassGroupIds: classGroupIds,
      };
    }

    if (!ADMIN_CALENDAR_CATEGORIES.includes(category)) {
      throw new ForbiddenException('Invalid calendar category for this role');
    }

    if (OFFICIAL_CALENDAR_CATEGORIES.includes(category)) {
      return {
        schoolYearId: dto.schoolYearId.toString(),
        title,
        description: dto.description?.trim() || null,
        category,
        kind: dto.kind,
        startDate,
        endDate,
        visibilityScope: OFFICIAL_CALENDAR_VISIBILITY_SCOPE,
        targetTeacherIds: [],
        targetAreaIds: [],
        targetClassGroupIds: [],
      };
    }

    const visibilityScope = dto.visibilityScope;
    if (
      !visibilityScope ||
      !ADMIN_COMMUNICATION_VISIBILITY_SCOPES.includes(visibilityScope)
    ) {
      throw new BadRequestException(
        'Select who should receive this communication',
      );
    }

    const targetTeacherIds = this.normalizeStringList(dto.targetTeacherIds);
    const targetAreaIds = this.normalizeStringList(dto.targetAreaIds);

    if (visibilityScope === 'selected_teachers') {
      if (targetTeacherIds.length === 0) {
        throw new BadRequestException(
          'Select at least one teacher for this communication',
        );
      }

      const users = await this.usersRepository.find({
        where: {
          nationalId: In(targetTeacherIds),
          role: 'teacher',
        },
      });

      if (users.length !== targetTeacherIds.length) {
        throw new BadRequestException(
          'One or more selected teachers do not exist',
        );
      }
    }

    if (visibilityScope === 'teacher_areas') {
      if (targetAreaIds.length === 0) {
        throw new BadRequestException(
          'Select at least one area for this communication',
        );
      }

      const areas = await this.subjectAreasRepository.find({
        where: {
          areaId: In(targetAreaIds),
        },
      });

      if (areas.length !== targetAreaIds.length) {
        throw new BadRequestException(
          'One or more selected areas do not exist',
        );
      }
    }

    return {
      schoolYearId: dto.schoolYearId.toString(),
      title,
      description: dto.description?.trim() || null,
      category,
      kind: dto.kind,
      startDate,
      endDate,
      visibilityScope,
      targetTeacherIds:
        visibilityScope === 'selected_teachers' ? targetTeacherIds : [],
      targetAreaIds:
        visibilityScope === 'teacher_areas' ? targetAreaIds : [],
      targetClassGroupIds: [],
    };
  }

  private canUserViewEvent(
    entity: CalendarEvents,
    currentUser: CalendarEventActor,
    teacherAreaIds: Set<string>,
  ) {
    if (currentUser.role === 'admin' || currentUser.role === 'coordinator') {
      return true;
    }

    if (currentUser.role === 'registrar') {
      return (
        entity.visibilityScope === 'everyone' ||
        entity.visibilityScope === 'registrars'
      );
    }

    if (currentUser.role === 'teacher') {
      if (entity.createdById === currentUser.nationalId) {
        return true;
      }

      if (entity.visibilityScope === 'everyone') {
        return true;
      }

      if (entity.visibilityScope === 'all_teachers') {
        return true;
      }

      if (
        entity.visibilityScope === 'selected_teachers' &&
        (entity.targetTeacherIds ?? []).includes(currentUser.nationalId)
      ) {
        return true;
      }

      if (entity.visibilityScope === 'teacher_areas') {
        return (entity.targetAreaIds ?? []).some((areaId) =>
          teacherAreaIds.has(areaId),
        );
      }
    }

    return false;
  }

  private assertCanMutate(role: SanitizedUser['role']) {
    if (!CALENDAR_EVENT_MUTATE_ROLES.includes(role)) {
      throw new ForbiddenException('You cannot modify calendar events');
    }
  }

  private assertCanEditEntity(
    entity: CalendarEvents,
    currentUser: CalendarEventActor,
  ) {
    if (currentUser.role === 'admin' || currentUser.role === 'coordinator') {
      return;
    }

    if (
      currentUser.role === 'teacher' &&
      entity.createdById === currentUser.nationalId
    ) {
      return;
    }

    throw new ForbiddenException('You cannot edit this calendar event');
  }

  private async getEntity(id: number): Promise<CalendarEvents> {
    const entity = await this.repository.findOne({
      where: { calendarEventId: id.toString() },
      relations: ['createdBy'],
    });

    if (!entity) {
      throw new NotFoundException('Calendar event not found');
    }

    return entity;
  }

  private async loadTeacherAreaIds(
    teacherId: string,
  ): Promise<Set<string>> {
    const rows = await this.teacherSubjectsRepository
      .createQueryBuilder('teacherSubjects')
      .innerJoin('teacherSubjects.subject', 'subject')
      .select('DISTINCT subject.areaId', 'areaId')
      .where('teacherSubjects.teacherId = :teacherId', { teacherId })
      .getRawMany<{ areaId: string }>();

    return new Set(rows.map((row) => row.areaId));
  }

  private async loadTeacherClassGroupIds(
    teacherId: string,
    schoolYearId: number,
  ): Promise<Set<string>> {
    const rows = await this.coursesRepository
      .createQueryBuilder('courses')
      .innerJoin('courses.classGroup', 'classGroup')
      .select('DISTINCT courses.classGroupId', 'classGroupId')
      .where('courses.teacherId = :teacherId', { teacherId })
      .andWhere('classGroup.schoolYearId = :schoolYearId', {
        schoolYearId: schoolYearId.toString(),
      })
      .getRawMany<{ classGroupId: string }>();

    return new Set(rows.map((row) => row.classGroupId));
  }

  private toResponse(
    entity: CalendarEvents,
    currentUser: CalendarEventActor,
  ): CalendarEventResponse {
    const fullName = `${entity.createdBy?.firstName ?? ''} ${
      entity.createdBy?.lastName ?? ''
    }`.trim();

    return {
      calendarEventId: Number(entity.calendarEventId),
      schoolYearId: Number(entity.schoolYearId),
      title: entity.title,
      description: entity.description ?? null,
      category: entity.category as CalendarEventCategory,
      kind: entity.kind,
      startDate: entity.startDate,
      endDate: entity.endDate,
      visibilityScope: entity.visibilityScope as CalendarEventVisibilityScope,
      targetTeacherIds: entity.targetTeacherIds ?? [],
      targetAreaIds: (entity.targetAreaIds ?? []).map((value) => Number(value)),
      targetClassGroupIds: (entity.targetClassGroupIds ?? []).map((value) =>
        Number(value),
      ),
      createdById: entity.createdById ?? null,
      createdByRole: entity.createdByRole ?? null,
      createdByName:
        fullName ||
        entity.createdBy?.username ||
        entity.createdBy?.nationalId ||
        null,
      isActive: entity.isActive,
      createdAt: entity.createdAt ? entity.createdAt.toISOString() : null,
      updatedAt: entity.updatedAt ? entity.updatedAt.toISOString() : null,
      editable:
        currentUser.role === 'admin' ||
        currentUser.role === 'coordinator' ||
        entity.createdById === currentUser.nationalId,
    };
  }

  private assertDateRange(startDate: string, endDate: string) {
    if (new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException(
        'Event startDate must be on or before endDate',
      );
    }
  }

  private assertWithinSchoolYear(
    startDate: string,
    endDate: string,
    yearStart: string,
    yearEnd: string,
  ) {
    if (startDate < yearStart || endDate > yearEnd) {
      throw new BadRequestException(
        'Event dates must fall within the selected school year',
      );
    }
  }

  private assertKindMatchesCategory(
    category: CalendarEventCategory,
    kind: string,
  ) {
    const allowedKinds = CALENDAR_EVENT_KIND_OPTIONS[category];
    if (!allowedKinds.includes(kind)) {
      throw new BadRequestException(
        `Kind ${kind} is not valid for category ${category}`,
      );
    }
  }

  private normalizeStringList(
    values?: Array<string | number> | null,
  ): string[] {
    return Array.from(
      new Set(
        (values ?? [])
          .map((value) => String(value).trim())
          .filter((value) => value.length > 0),
      ),
    );
  }

  private normalizeDate(value: string) {
    const normalized = value.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      throw new BadRequestException('Dates must use YYYY-MM-DD format');
    }
    return normalized;
  }
}
