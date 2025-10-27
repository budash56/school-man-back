import { IsDateString, IsIn, IsInt, IsOptional, Min } from 'class-validator';

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
  @IsIn(['own', 'group'])
  scope?: 'own' | 'group';

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  pageSize?: number;
}
