import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class UpdateCurriculumAreaDto {
  @ApiProperty({
    description: 'Specialization area id to link to the curriculum',
    example: 1,
  })
  @IsInt()
  @IsPositive()
  specializationAreaId: number;
}
