import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

export class CreateClassGroupDto {
  @IsInt()
  @Min(1)
  schoolYearId: number;

  @IsInt()
  @Min(1)
  @Max(11)
  gradeLevel: number;

  @Matches(/^\d{2}$/, {
    message: 'section must be a two digit string',
  })
  section: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  defaultClassroomId?: number;
}
