// Describes the minimum data needed to register a new platform user.
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class SignupDto {
  @ApiProperty({
    example: '900100',
    description: 'Unique national ID for the user',
  })
  @IsString()
  @Matches(/^[A-Z0-9\-_.]{3,32}$/i, {
    message:
      'nationalId must be 3-32 characters using letters, numbers, hyphen, underscore, or dot',
  })
  nationalId: string;

  @ApiProperty({
    example: 'Admin#123',
    description: 'Plain text password (min 8 characters)',
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    example: 'admin.user',
    description: 'Optional username; defaults to nationalId when omitted',
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({
    example: 'admin',
    description: 'Only admins can create other admins',
  })
  @IsOptional()
  @IsIn(['admin', 'registrar', 'teacher', 'coordinator'])
  role?: 'admin' | 'registrar' | 'teacher' | 'coordinator';

  @ApiPropertyOptional({ example: 'Maria' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Lopez' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: 'maria.lopez@example.edu' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+57 3001234567' })
  @IsOptional()
  @IsString()
  phone?: string;
}
