import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateAttendanceDto {
  @IsOptional()
  @IsIn(['P', 'A', 'AE'])
  status?: 'P' | 'A' | 'AE';

  @IsOptional()
  @IsString()
  reasonNote?: string;

  @IsOptional()
  @IsDateString()
  excusedAt?: string;
}
