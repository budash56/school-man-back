import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TimetableAssignmentsQueryDto } from './timetable-assignments-query.dto';

describe('TimetableAssignmentsQueryDto', () => {
  it('accepts numeric string parameters via transformation', async () => {
    const dto = plainToInstance(TimetableAssignmentsQueryDto, {
      courseId: '10',
      classGroupId: '5',
      slotId: '2',
      teacherId: '800002',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects non-numeric identifiers', async () => {
    const dto = plainToInstance(TimetableAssignmentsQueryDto, {
      courseId: 'not-a-number',
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'courseId')).toBe(true);
  });
});
