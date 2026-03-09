import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'Temp#1234' })
  @IsString()
  @MinLength(6)
  currentPassword: string;

  @ApiProperty({ example: 'Nuevo#1234' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
