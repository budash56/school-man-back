import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class CreateEnrollmentDto {
  @ApiProperty({
    description: 'Identifier of the student being enrolled',
    example: 501,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  studentId: number;

  @ApiProperty({
    description: 'Identifier of the class group the student joins',
    example: 32,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  classGroupId: number;

  @ApiProperty({
    description: 'Identifier of the school year for the enrollment',
    example: 2026,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  schoolYearId: number;
}
