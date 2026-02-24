import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { IsInt, IsPositive } from 'class-validator';

export class CreateTeacherSubjectDto {
  @ApiProperty({
    example: '199001011234',
    description: 'Teacher national ID',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  teacherId: string;

  @ApiProperty({
    example: 12,
    description: 'Subject identifier assigned to the teacher',
  })
  @Transform(({ value }) =>
    value === undefined || value === null
      ? undefined
      : Number.parseInt(value, 10),
  )
  @IsInt()
  @IsPositive()
  subjectId: number;
}
