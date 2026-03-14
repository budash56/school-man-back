import { IsInt, IsString, Matches, MaxLength, Min } from 'class-validator';

export class CreateCourseDto {
  @IsInt()
  @Min(1)
  courseInstanceId: number;

  @IsInt()
  @Min(1)
  classGroupId: number;

  @IsString()
  @MaxLength(50)
  @Matches(/^\d+$/, {
    message: 'teacherId must contain digits only',
  })
  teacherId: string;
}
