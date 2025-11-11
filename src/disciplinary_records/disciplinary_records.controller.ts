import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiTags,
} from '@nestjs/swagger';
import { READ_ROLES, Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { DisciplinaryRecordsService } from './disciplinary_records.service';
import { QueryDisciplinaryRecordDto } from './dto/query-disciplinary-record.dto';
import { CreateDisciplinaryRecordDto } from './dto/create-disciplinary-record.dto';
import { UpdateDisciplinaryRecordDto } from './dto/update-disciplinary-record.dto';

@ApiTags('disciplinary-records')
@Roles(...READ_ROLES)
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('disciplinary-records')
export class DisciplinaryRecordsController {
  constructor(private readonly service: DisciplinaryRecordsService) {}

  @Get()
  findAll(@Query() query: QueryDisciplinaryRecordDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Roles('admin', 'coordinator')
  @Post()
  @ApiBody({
    type: CreateDisciplinaryRecordDto,
    examples: {
      default: {
        summary: 'Create disciplinary record',
        value: {
          studentId: 1234,
          recordedBy: 'PRINCIPAL01',
          dateHappened: '2025-02-10',
          category: 'yellow',
          description: 'Late for class without excuse',
          expiresAt: '2025-05-31',
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  create(@Body() dto: CreateDisciplinaryRecordDto) {
    return this.service.create(dto);
  }

  @Roles('admin', 'coordinator')
  @Patch(':id')
  @ApiBody({
    type: UpdateDisciplinaryRecordDto,
    examples: {
      default: {
        summary: 'Update disciplinary record',
        value: {
          category: 'red',
          description: 'Escalated after review',
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDisciplinaryRecordDto,
  ) {
    return this.service.update(id, dto);
  }

  @Roles('admin', 'coordinator')
  @Delete(':id')
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return { deleted: true };
  }
}
