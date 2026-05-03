import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'usuario@example.edu' })
  @IsOptional()
  @IsEmail()
  email?: string | null;
}
