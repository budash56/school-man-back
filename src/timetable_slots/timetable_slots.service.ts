import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { TimetableSlotRepository } from './timetable_slots.repository';
import { TimetableSlot } from './timetable_slots.entity';
import { CreateTimetableSlotDto } from './dto/create-timetable-slot.dto';
import { UpdateTimetableSlotDto } from './dto/update-timetable-slot.dto';
import type { ScheduleDivision } from './timetable-division.type';

@Injectable()
export class TimetableSlotsService {
  constructor(private readonly repository: TimetableSlotRepository) {}

  findAll(): Promise<TimetableSlot[]> {
    return this.repository.find();
  }

  async findOne(id: number): Promise<TimetableSlot> {
    const entity = await this.repository.findOne({ where: { slotId: id } });
    if (!entity) {
      throw new NotFoundException('Timetable slot not found');
    }
    return entity;
  }

  async create(dto: CreateTimetableSlotDto): Promise<TimetableSlot> {
    await this.assertUniqueSlot(
      dto.dayOfWeek,
      dto.startTime,
      dto.endTime,
      dto.division as ScheduleDivision,
    );
    const durationMinutes = this.calculateDurationMinutes(
      dto.startTime,
      dto.endTime,
    );
    this.assertDurationOverride(dto.durationMinutes, durationMinutes);

    const entity = this.repository.create({
      ...dto,
      durationMinutes,
    } as Partial<TimetableSlot>);
    return this.repository.save(entity);
  }

  async update(id: number, dto: UpdateTimetableSlotDto): Promise<TimetableSlot> {
    const slot = await this.findOne(id);
    const dayOfWeek = dto.dayOfWeek ?? slot.dayOfWeek;
    const startTime = dto.startTime ?? slot.startTime;
    const endTime = dto.endTime ?? slot.endTime;
    const division = (dto.division ?? slot.division) as ScheduleDivision;
    await this.assertUniqueSlot(
      dayOfWeek,
      startTime,
      endTime,
      division,
      slot.slotId,
    );
    const durationMinutes = this.calculateDurationMinutes(startTime, endTime);
    this.assertDurationOverride(dto.durationMinutes, durationMinutes);

    this.repository.merge(slot, {
      ...dto,
      dayOfWeek,
      startTime,
      endTime,
      durationMinutes,
      division,
    });
    return this.repository.save(slot);
  }

  async remove(id: number): Promise<{ deleted: true }> {
    const slot = await this.findOne(id);
    await this.repository.remove(slot);
    return { deleted: true };
  }

  private async assertUniqueSlot(
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    division: string,
    ignoreSlotId?: number,
  ): Promise<void> {
    const qb = this.repository
      .createQueryBuilder('slot')
      .where('slot.dayOfWeek = :dayOfWeek', { dayOfWeek })
      .andWhere('slot.startTime = :startTime', { startTime })
      .andWhere('slot.endTime = :endTime', { endTime })
      .andWhere('slot.division = :division', { division });

    if (ignoreSlotId) {
      qb.andWhere('slot.slotId != :ignoreSlotId', { ignoreSlotId });
    }

    const exists = await qb.getCount();
    if (exists > 0) {
      throw new ConflictException('A slot with the same day and time already exists');
    }
  }

  private calculateDurationMinutes(start: string, end: string): number {
    const startSeconds = this.timeToSeconds(start);
    const endSeconds = this.timeToSeconds(end);

    if (endSeconds <= startSeconds) {
      throw new BadRequestException('endTime must be greater than startTime');
    }

    return Math.round((endSeconds - startSeconds) / 60);
  }

  private timeToSeconds(value: string): number {
    const [hours, minutes, seconds] = value.split(':');
    const h = Number(hours);
    const m = Number(minutes);
    const s = seconds !== undefined ? Number(seconds) : 0;

    if ([h, m, s].some((n) => Number.isNaN(n))) {
      throw new BadRequestException('Invalid time value');
    }

    return h * 3600 + m * 60 + s;
  }

  private assertDurationOverride(provided: number | undefined, expected: number): void {
    if (provided !== undefined && provided !== expected) {
      throw new BadRequestException(
        `durationMinutes (${provided}) must match the difference between start and end time (${expected})`,
      );
    }
  }
}
