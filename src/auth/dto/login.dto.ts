// Defines the required credential payload for login requests.
import { IsString, Matches, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @Matches(/^[A-Z0-9\-_.]{3,32}$/i, {
    message: 'nationalId must be 3-32 characters using letters, numbers, hyphen, underscore, or dot',
  })
  nationalId: string;

  @IsString()
  @MinLength(8)
  password: string;
}
