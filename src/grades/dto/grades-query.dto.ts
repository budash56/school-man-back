import { IsInt, IsOptional, Min } from 'class-validator';

export const GRADES_DEFAULT_PAGE_SIZE = 25;
export const GRADES_MAX_PAGE_SIZE = 100;

export class GradesQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  studentId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  courseId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  termId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  schoolYearId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  pageSize?: number;
}
