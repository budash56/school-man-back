import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { TimetableSlotRepository } from './timetable_slots.repository';
import { TimetableSlot } from './timetable_slots.entity';
import { CreateTimetableSlotDto } from './dto/create-timetable-slot.dto';
import { UpdateTimetableSlotDto } from './dto/update-timetable-slot.dto';

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
    await this.assertUniqueSlot(dto.dayOfWeek, dto.startTime, dto.endTime);
    const entity = this.repository.create(dto as Partial<TimetableSlot>);
    return this.repository.save(entity);
  }

  async update(id: number, dto: UpdateTimetableSlotDto): Promise<TimetableSlot> {
    const slot = await this.findOne(id);
    const dayOfWeek = dto.dayOfWeek ?? slot.dayOfWeek;
    const startTime = dto.startTime ?? slot.startTime;
    const endTime = dto.endTime ?? slot.endTime;
    await this.assertUniqueSlot(dayOfWeek, startTime, endTime, slot.slotId);
    this.repository.merge(slot, dto);
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
    ignoreSlotId?: number,
  ): Promise<void> {
    const qb = this.repository
      .createQueryBuilder('slot')
      .where('slot.dayOfWeek = :dayOfWeek', { dayOfWeek })
      .andWhere('slot.startTime = :startTime', { startTime })
      .andWhere('slot.endTime = :endTime', { endTime });

    if (ignoreSlotId) {
      qb.andWhere('slot.slotId != :ignoreSlotId', { ignoreSlotId });
    }

    const exists = await qb.getCount();
    if (exists > 0) {
      throw new ConflictException('A slot with the same day and time already exists');
    }
  }
}
