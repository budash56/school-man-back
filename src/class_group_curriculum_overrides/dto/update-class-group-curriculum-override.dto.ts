import { PartialType } from '@nestjs/mapped-types';
import { CreateClassGroupCurriculumOverrideDto } from './create-class-group-curriculum-override.dto';

export class UpdateClassGroupCurriculumOverrideDto extends PartialType(
  CreateClassGroupCurriculumOverrideDto,
) {}
