import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTimetableSlotDto } from './create-timetable-slot.dto';

describe('CreateTimetableSlotDto', () => {
  it('accepts a valid payload', async () => {
    const dto = plainToInstance(CreateTimetableSlotDto, {
      dayOfWeek: 2,
      startTime: '08:00',
      endTime: '09:00',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects invalid day', async () => {
    const dto = plainToInstance(CreateTimetableSlotDto, {
      dayOfWeek: 0,
      startTime: '08:00',
      endTime: '09:00',
    });

    const errors = await validate(dto);
    expect(errors).not.toHaveLength(0);
  });

  it('rejects invalid time format', async () => {
    const dto = plainToInstance(CreateTimetableSlotDto, {
      dayOfWeek: 3,
      startTime: '8am',
      endTime: '09:00',
    });

    const errors = await validate(dto);
    expect(
      errors.some((error) => error.property === 'startTime'),
    ).toBeTruthy();
  });
});
