import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const USER_ROLES = [
  'admin',
  'registrar',
  'teacher',
  'coordinator',
] as const;
type UserRole = (typeof USER_ROLES)[number];

export class CreateUsersDto {
  @ApiProperty({
    example: '199001011234',
    description: 'Unique national identifier',
  })
  @IsString()
  @MinLength(4)
  @MaxLength(50)
  nationalId: string;

  @ApiProperty({ example: 'jdoe', description: 'Unique username for login' })
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  username: string;

  @ApiPropertyOptional({
    example: '$2b$10$FDSf0rjLQ8HsZb0zFvYeOeZKz3R8G5UfH6OteIFqiyIqOQUd0pD3e',
    description:
      'Optional BCrypt password hash. If omitted or empty, a temporary password is generated from 1er apellido + 4 ultimos digitos del ID (ej: Medina9335).',
  })
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsOptional()
  @IsString()
  @MinLength(20)
  @MaxLength(255)
  passwordHash?: string;

  @ApiProperty({
    example: 'teacher',
    enum: USER_ROLES,
    description: 'Role assigned to the user',
  })
  @IsIn(USER_ROLES)
  role: UserRole;

  @ApiPropertyOptional({
    example: 'John',
    description: 'First name of the user',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string;

  @ApiPropertyOptional({
    example: 'Doe',
    description:
      'Last name of the user. Used for temp password generation when passwordHash is omitted.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @ApiPropertyOptional({
    example: 'john.doe@example.edu',
    description: 'Contact email address',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @ApiPropertyOptional({
    example: '+1-202-555-0199',
    description: 'Contact phone number',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the user is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
