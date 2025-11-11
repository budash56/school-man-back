// Describes the minimum data needed to register a new platform user.
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class SignupDto {
  @IsString()
  @Matches(/^[A-Z0-9\-_.]{3,32}$/i, {
    message:
      'nationalId must be 3-32 characters using letters, numbers, hyphen, underscore, or dot',
  })
  nationalId: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsIn(['admin', 'registrar', 'teacher', 'coordinator'])
  role?: 'admin' | 'registrar' | 'teacher' | 'coordinator';

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
