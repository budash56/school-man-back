import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { SUBJECT_CODE_REGEX } from '../../subject_areas/dto/create-subject-area.dto';

export class CreateSubjectDto {
  @ApiProperty({ example: 1, description: 'Identifier of the subject area' })
  @Type(() => Number)
  @IsInt()
  areaId: number;

  @ApiProperty({ example: 'MATH_ALG', description: 'Unique subject code' })
  @IsString()
  @IsNotEmpty()
  @Matches(SUBJECT_CODE_REGEX, {
    message: 'code must be 2-16 characters using A-Z, 0-9, or underscore',
  })
  code: string;

  @ApiProperty({ example: 'Algebra I', maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({
    example: 'Introduction to algebraic expressions and equations',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
