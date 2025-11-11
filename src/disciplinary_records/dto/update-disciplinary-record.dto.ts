import { PartialType } from '@nestjs/mapped-types';
import { CreateDisciplinaryRecordDto } from './create-disciplinary-record.dto';

export class UpdateDisciplinaryRecordDto extends PartialType(
  CreateDisciplinaryRecordDto,
) {}
