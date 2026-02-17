import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCurriculumDto } from './create-curriculum.dto';

describe('CreateCurriculumDto', () => {
  it('accepts a valid payload', async () => {
    const dto = plainToInstance(CreateCurriculumDto, {
      gradeLevel: 10,
      name: 'Grade 10 Curriculum',
      items: [
        {
          subjectId: 12,
          weeklyHours: 4,
          doubleSessionRequired: true,
        },
      ],
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects missing items', async () => {
    const dto = plainToInstance(CreateCurriculumDto, {
      gradeLevel: 10,
      name: 'Grade 10 Curriculum',
      items: [],
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'items')).toBeTruthy();
  });

  it('rejects invalid item values', async () => {
    const dto = plainToInstance(CreateCurriculumDto, {
      gradeLevel: 10,
      name: 'Grade 10 Curriculum',
      items: [
        {
          subjectId: 0,
          weeklyHours: -2,
        },
      ],
    });

    const errors = await validate(dto);
    const itemErrors = errors.find((error) => error.property === 'items');
    expect(itemErrors).toBeDefined();
  });
});
