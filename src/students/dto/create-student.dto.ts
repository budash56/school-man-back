import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const NATIONAL_ID_REGEX = /^[A-Z0-9-_.]{3,32}$/i;
const GUARDIAN_RELATIONSHIP_OPTIONS = [
  'Madre',
  'Padre',
  'Hermana',
  'Hermano',
  'Abuela',
  'Abuelo',
  'Tia',
  'Tio',
  'Otro',
] as const;

export type GuardianRelationshipOption =
  (typeof GUARDIAN_RELATIONSHIP_OPTIONS)[number];

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
    example: 'Madre',
    description: 'Relationship between guardian and student',
  })
  @IsIn(GUARDIAN_RELATIONSHIP_OPTIONS, {
    message:
      'guardianRelationship must be one of: Madre, Padre, Hermana, Hermano, Abuela, Abuelo, Tia, Tio, Otro',
  })
  guardianRelationship: GuardianRelationshipOption;

  @ApiPropertyOptional({
    example: 'Padrino',
    description: 'Specify the relationship when guardianRelationship is Otro',
  })
  @ValidateIf((dto) => dto.guardianRelationship === 'Otro')
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  guardianRelationshipOther?: string;

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

export { NATIONAL_ID_REGEX, GUARDIAN_RELATIONSHIP_OPTIONS };
