import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class AutoAssignClassGroupsDto {
  @ApiProperty({
    description: 'School year identifier',
    example: 2,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  schoolYearId: number;

  @ApiProperty({
    description: 'Grade level to create sections for',
    example: 7,
    minimum: 1,
    maximum: 11,
  })
  @IsInt()
  @Min(1)
  @Max(11)
  gradeLevel: number;
}
