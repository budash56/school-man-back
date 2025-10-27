// Provides CRUD endpoints for terms using the generated Terms entity.
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
} from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { CreateTermDto } from './dto/create-term.dto';
import { UpdateTermDto } from './dto/update-term.dto';
import { TermsQueryDto } from './dto/terms-query.dto';
import { TermsService } from './terms.service';
import { READ_ROLES, Roles, WRITE_ROLES } from '../auth/roles.decorator';

@ApiTags('terms')
@Roles(...READ_ROLES)
@Controller('terms')
export class TermsController {
  constructor(private readonly termsService: TermsService) {}

  @Get()
  @ApiQuery({ name: 'active', required: false, example: true })
  @ApiQuery({ name: 'name', required: false, example: 'P1' })
  @ApiQuery({ name: 'schoolYearId', required: false, example: 1 })
  findAll(@Query() query: TermsQueryDto) {
    return this.termsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.termsService.findOne(id);
  }

  @Roles(...WRITE_ROLES)
  @Post()
  create(@Body() dto: CreateTermDto) {
    return this.termsService.create(dto);
  }

  @Roles(...WRITE_ROLES)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTermDto) {
    return this.termsService.update(id, dto);
  }

  @Roles(...WRITE_ROLES)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.termsService.remove(id);
  }
}
