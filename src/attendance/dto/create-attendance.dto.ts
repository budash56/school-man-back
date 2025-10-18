import { IsDateString, IsIn, IsInt, Min } from 'class-validator';

export class CreateAttendanceDto {
  @IsInt()
  @Min(1)
  studentId: number;

  @IsInt()
  @Min(1)
  courseId: number;

  @IsInt()
  @Min(1)
  slotId: number;

  @IsDateString()
  date: string;

  @IsIn(['P', 'A', 'AE'])
  status: 'P' | 'A' | 'AE';
}
