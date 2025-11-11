import { PartialType } from '@nestjs/swagger';
import { CreateTimetableAssignmentDto } from './create-timetable-assignment.dto';

export class UpdateTimetableAssignmentDto extends PartialType(
  CreateTimetableAssignmentDto,
) {}
