import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export const SUBJECT_CODE_REGEX = /^[A-Z0-9_]{2,16}$/;

export class CreateSubjectAreaDto {
  @ApiProperty({ example: 'MATH', description: 'Unique area code', maxLength: 16 })
  @IsString()
  @IsNotEmpty()
  @Matches(SUBJECT_CODE_REGEX, {
    message: 'code must be 2-16 characters using A-Z, 0-9, or underscore',
  })
  code: string;

  @ApiProperty({ example: 'Mathematics', maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;
}
