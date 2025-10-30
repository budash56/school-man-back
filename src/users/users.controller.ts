import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { Roles, WRITE_ROLES } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
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
        summary: 'Create user',
        value: {
          nationalId: '199001011234',
          username: 'jdoe',
          passwordHash: '$2b$10$FDSf0rjLQ8HsZb0zFvYeOeZKz3R8G5UfH6OteIFqiyIqOQUd0pD3e',
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
  create(@Body() dto: CreateUsersDto) {
    return this.service.create(dto);
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
  update(@Param('id') id: string, @Body() dto: UpdateUsersDto) {
    return this.service.update(id, dto);
  }

  @Roles(...WRITE_ROLES)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
