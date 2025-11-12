import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class ActiveStudentCertificateDto {
  @ApiProperty({ example: 101, description: 'Student identifier', minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  studentId: number;

  @ApiProperty({
    example: 3,
    description: 'School year identifier for the certificate',
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  schoolYearId: number;
}
