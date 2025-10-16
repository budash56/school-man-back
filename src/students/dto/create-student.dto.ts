import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const NATIONAL_ID_REGEX = /^[A-Z0-9-_.]{3,32}$/i;

export class CreateStudentDto {
  @ApiProperty({
    example: 'CC-1234567',
    description: 'Unique identifier used nationally for the student',
  })
  @IsString()
  @Matches(NATIONAL_ID_REGEX, {
    message: 'nationalId must contain 3-32 alphanumeric characters plus -_.',
  })
  nationalId: string;

  @ApiProperty({ example: 'Juana', maxLength: 80 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName: string;

  @ApiProperty({ example: 'García', maxLength: 80 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName: string;

  @ApiPropertyOptional({
    example: '2010-05-15',
    description: 'ISO-8601 birth date (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  dob?: string;

  @ApiPropertyOptional({ example: 'Calle 123 #45-67' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiProperty({
    example: 'Marta Ramirez',
    description: 'Full name of the legal guardian',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  guardianName: string;

  @ApiProperty({
    example: 'Mother',
    description: 'Relationship between guardian and student',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  guardianRelationship: string;

  @ApiProperty({
    example: '+57 3001234567',
    description: 'Guardian contact phone number',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(7)
  @MaxLength(30)
  guardianPhone: string;
}

export { NATIONAL_ID_REGEX };
