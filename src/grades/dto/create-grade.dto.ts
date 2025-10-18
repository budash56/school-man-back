import { IsIn, IsInt, IsOptional, MaxLength, Min } from 'class-validator';

export class CreateGradeDto {
  @IsInt()
  @Min(1)
  studentId: number;

  @IsInt()
  @Min(1)
  courseId: number;

  @IsInt()
  @Min(1)
  termId: number;

  @IsIn(['S', 'A', 'B', 'J'])
  mark: 'S' | 'A' | 'B' | 'J';

  @IsOptional()
  @MaxLength(500)
  comment?: string;
}
