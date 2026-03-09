import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class CompleteSchoolYearDto {
  @ApiPropertyOptional({
    example: false,
    description: 'Force completion regardless of closing date (testing)',
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
