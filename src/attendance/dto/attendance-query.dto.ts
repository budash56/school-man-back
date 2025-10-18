import { IsDateString, IsIn, IsInt, IsOptional, Min } from 'class-validator';

export const ATTENDANCE_DEFAULT_PAGE_SIZE = 25;
export const ATTENDANCE_MAX_PAGE_SIZE = 100;

export class AttendanceQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  studentId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  courseId?: number;

  @IsOptional()
  @IsIn(['P', 'A', 'AE'])
  status?: 'P' | 'A' | 'AE';

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  pageSize?: number;
}
