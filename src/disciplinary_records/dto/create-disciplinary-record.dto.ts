import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

type Category = 'green' | 'yellow' | 'red' | 'last_notice';

export class CreateDisciplinaryRecordDto {
  @ApiProperty({ example: 1234, description: 'Student identifier' })
  @IsInt()
  @Min(1)
  studentId: number;

  @ApiProperty({
    example: 'PRINCIPAL01',
    description: 'User national ID who recorded the event',
  })
  @IsString()
  recordedBy: string;

  @ApiProperty({
    example: '2025-02-10',
    description: 'Date when the incident happened (ISO date)',
  })
  @IsDateString()
  dateHappened: string;

  @ApiProperty({
    example: 'yellow',
    enum: ['green', 'yellow', 'red', 'last_notice'],
  })
  @IsEnum(['green', 'yellow', 'red', 'last_notice'])
  category: Category;

  @ApiPropertyOptional({
    example: 'Late for class without excuse',
    description: 'Optional description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    example: '2025-05-31',
    description: 'Optional expiration date',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
