import { PartialType } from '@nestjs/mapped-types';
import { CreateSchoolYearDto } from './create-school-year.dto';

export class UpdateSchoolYearDto extends PartialType(CreateSchoolYearDto) {}
