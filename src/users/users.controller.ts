import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { READ_ROLES, Roles, WRITE_ROLES } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SanitizedUser } from '../auth/auth.types';
import { UsersService } from './users.service';
import { QueryUsersDto } from './dto/query-users.dto';
import { CreateUsersDto } from './dto/create-users.dto';
import { UpdateUsersDto } from './dto/update-users.dto';

@ApiTags('users')
@Roles('admin', 'coordinator')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  findAll(@Query() query: QueryUsersDto) {
    return this.service.findAll(query);
  }

  @Roles(...READ_ROLES)
  @Get('teachers')
  findTeachers(@Query() query: QueryUsersDto) {
    return this.service.findTeachers(query);
  }

  @Roles(...READ_ROLES)
  @Get('teachers/:id')
  findTeacher(@Param('id') id: string) {
    return this.service.findTeacher(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Roles(...WRITE_ROLES)
  @Post()
  @ApiBody({
    type: CreateUsersDto,
    examples: {
      default: {
        summary: 'Create user (auto temp password)',
        value: {
          nationalId: '199001011234',
          username: 'jdoe',
          role: 'teacher',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.edu',
          phone: '+1-202-555-0199',
          isActive: true,
        },
      },
      explicitHash: {
        summary: 'Create user (explicit password hash)',
        value: {
          nationalId: '199001011234',
          username: 'jdoe',
          passwordHash:
            '$2b$10$FDSf0rjLQ8HsZb0zFvYeOeZKz3R8G5UfH6OteIFqiyIqOQUd0pD3e',
          role: 'teacher',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.edu',
          phone: '+1-202-555-0199',
          isActive: true,
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: `Forbidden: requires role ${WRITE_ROLES.join(', ')}`,
  })
  create(@Body() dto: CreateUsersDto, @CurrentUser() user?: SanitizedUser) {
    return this.service.create(dto, user);
  }

  @Roles(...WRITE_ROLES)
  @Post('bulk-import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiForbiddenResponse({
    description: `Forbidden: requires role ${WRITE_ROLES.join(', ')}`,
  })
  bulkImport(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user?: SanitizedUser,
  ) {
    return this.service.bulkImport(file, user);
  }

  @Roles(...WRITE_ROLES)
  @Patch(':id')
  @ApiBody({
    type: UpdateUsersDto,
    examples: {
      default: {
        summary: 'Update user contact information',
        value: {
          email: 'johnny.doe@example.edu',
          phone: '+1-202-555-0100',
          isActive: false,
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: `Forbidden: requires role ${WRITE_ROLES.join(', ')}`,
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUsersDto,
    @CurrentUser() user?: SanitizedUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @Roles(...WRITE_ROLES)
  @Delete(':id')
  @ApiForbiddenResponse({
    description: `Forbidden: requires role ${WRITE_ROLES.join(', ')}`,
  })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
