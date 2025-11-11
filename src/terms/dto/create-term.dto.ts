import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsPositive } from 'class-validator';
import { TermName } from './term-name.enum';

export class CreateTermDto {
  @ApiProperty({
    example: 1,
    description: 'Identifier of the parent school year',
  })
  @Transform(({ value }) =>
    value === undefined || value === null
      ? undefined
      : Number.parseInt(value, 10),
  )
  @IsInt()
  @IsPositive()
  schoolYearId: number;

  @ApiProperty({
    example: TermName.P1,
    enum: TermName,
    description: 'Name of the term. Only predefined values are accepted',
  })
  @IsEnum(TermName)
  name: TermName;

  @ApiProperty({ example: '2025-09-01', description: 'First day of the term' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2025-10-31', description: 'Last day of the term' })
  @IsDateString()
  endDate: string;
}
