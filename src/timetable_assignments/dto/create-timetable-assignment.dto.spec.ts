import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTimetableAssignmentDto } from './create-timetable-assignment.dto';

describe('CreateTimetableAssignmentDto', () => {
  it('validates a complete payload', async () => {
    const dto = plainToInstance(CreateTimetableAssignmentDto, {
      courseId: 10,
      slotId: 4,
      teacherId: 'teach-001',
      classGroupId: 5,
      classroomId: 2,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects missing courseId', async () => {
    const dto = plainToInstance(CreateTimetableAssignmentDto, {
      slotId: 4,
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'courseId')).toBe(true);
  });

  it('rejects negative identifiers', async () => {
    const dto = plainToInstance(CreateTimetableAssignmentDto, {
      courseId: -1,
      slotId: -2,
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
