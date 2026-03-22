import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Express } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SanitizedUser } from '../auth/auth.types';
import { READ_ROLES, Roles, WRITE_ROLES } from '../auth/roles.decorator';
import { PlanillasService } from './planillas.service';
import { QueryPlanillaDto } from './dto/query-planilla.dto';
import { ImportPlanillaDto } from './dto/import-planilla.dto';
import { UpdatePlanillaDto } from './dto/update-planilla.dto';
import { FinalizePlanillaDto } from './dto/finalize-planilla.dto';

@ApiTags('planillas')
@Roles(...READ_ROLES)
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('planillas')
export class PlanillasController {
  constructor(private readonly service: PlanillasService) {}

  @Get()
  findAll(
    @Query() query: QueryPlanillaDto,
    @CurrentUser() user?: SanitizedUser,
  ) {
    return this.service.findAll(query, this.toActingUser(user));
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user?: SanitizedUser,
  ) {
    return this.service.findOne(id, this.toActingUser(user));
  }

  @Roles(...WRITE_ROLES)
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        schoolYearId: { type: 'number' },
        replaceExisting: { type: 'boolean' },
        file: { type: 'string', format: 'binary' },
      },
      required: ['schoolYearId', 'file'],
    },
  })
  @ApiForbiddenResponse({
    description: `Forbidden: requires role ${WRITE_ROLES.join(', ')}`,
  })
  importPlanillas(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ImportPlanillaDto,
    @CurrentUser() user?: SanitizedUser,
  ) {
    return this.service.importPlanillas(
      file,
      dto.schoolYearId,
      dto.replaceExisting ?? true,
      this.toActingUser(user),
    );
  }

  @Roles('admin', 'coordinator', 'teacher')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlanillaDto,
    @CurrentUser() user?: SanitizedUser,
  ) {
    return this.service.update(id, dto, this.toActingUser(user));
  }

  @Roles(...WRITE_ROLES)
  @Post(':id/finalize')
  finalize(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: FinalizePlanillaDto,
    @CurrentUser() user?: SanitizedUser,
  ) {
    return this.service.finalize(id, dto, this.toActingUser(user));
  }

  private toActingUser(user?: SanitizedUser) {
    return {
      nationalId: user?.nationalId ?? '',
      role: user?.role ?? 'teacher',
    };
  }
}
