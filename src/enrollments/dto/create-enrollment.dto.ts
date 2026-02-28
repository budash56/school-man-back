import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min, ValidateIf } from 'class-validator';

export class CreateEnrollmentDto {
  @ApiProperty({
    description: 'Identifier of the student being enrolled',
    example: 501,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  studentId: number;

  @ApiPropertyOptional({
    description:
      'Identifier of the class group the student joins (optional during enrollment period)',
    example: 32,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  classGroupId?: number;

  @ApiPropertyOptional({
    description:
      'Grade level for the enrollment (required when classGroupId is not provided)',
    example: 10,
    minimum: 1,
    maximum: 11,
  })
  @ValidateIf((dto) => dto.classGroupId === undefined || dto.classGroupId === null)
  @IsInt()
  @Min(1)
  @Max(11)
  gradeLevel?: number;

  @ApiProperty({
    description: 'Identifier of the school year for the enrollment',
    example: 2026,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  schoolYearId: number;
}
