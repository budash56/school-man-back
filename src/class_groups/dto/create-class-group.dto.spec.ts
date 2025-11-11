import {
  ArgumentMetadata,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { CreateClassGroupDto } from './create-class-group.dto';

const validationPipe = new ValidationPipe({
  whitelist: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

describe('CreateClassGroupDto validation', () => {
  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: CreateClassGroupDto,
  };

  it('throws BadRequestException when section does not match two digit pattern', async () => {
    await expect(
      validationPipe.transform(
        {
          schoolYearId: 1,
          gradeLevel: 4,
          section: 'A1',
        },
        metadata,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
