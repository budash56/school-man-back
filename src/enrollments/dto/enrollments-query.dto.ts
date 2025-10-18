import { IsInt, IsOptional, Min } from 'class-validator';

export const ENROLLMENTS_DEFAULT_PAGE_SIZE = 25;
export const ENROLLMENTS_MAX_PAGE_SIZE = 100;

export class EnrollmentsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  studentId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  classGroupId?: number;

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
