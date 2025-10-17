import { PartialType } from '@nestjs/mapped-types';
import { CreateSubjectAreaDto } from './create-subject-area.dto';

export class UpdateSubjectAreaDto extends PartialType(CreateSubjectAreaDto) {}
