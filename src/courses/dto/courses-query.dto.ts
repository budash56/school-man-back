import { IsInt, IsOptional, Matches, Min } from 'class-validator';

export class CoursesQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  schoolYearId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  gradeLevel?: number;

  @IsOptional()
  @Matches(/^\d{2}$/, {
    message: 'section must be a two digit string',
  })
  section?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  teacherId?: number;
}
