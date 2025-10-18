import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

export class ClassGroupsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  schoolYearId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(11)
  gradeLevel?: number;

  @IsOptional()
  @Matches(/^\d{2}$/, {
    message: 'section must be a two digit string',
  })
  section?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  pageSize?: number;
}
