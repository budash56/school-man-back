import { IsInt, Min } from 'class-validator';

export class CreateCourseDto {
  @IsInt()
  @Min(1)
  courseInstanceId: number;

  @IsInt()
  @Min(1)
  classGroupId: number;

  @IsInt()
  @Min(1)
  teacherId: number;
}
