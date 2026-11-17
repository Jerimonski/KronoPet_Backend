import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { StaffRole } from '@prisma/client';
import {
  actorOf,
  AuthUser,
  CurrentUser,
  Roles,
  StaffOnly,
} from '../common/decorators';
import { StaffDto, StaffStatusDto } from './dto/staff.dto';
import { StaffService } from './staff.service';

// Todo el personal ve el equipo (firmas de fichas); solo los administradores lo gestionan
@StaffOnly()
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.staffService.findAll(user.clinicId!);
  }

  @Roles(StaffRole.administrador)
  @Post()
  create(@Body() dto: StaffDto, @CurrentUser() user: AuthUser) {
    return this.staffService.create(dto, actorOf(user));
  }

  @Roles(StaffRole.administrador)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StaffDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.staffService.update(id, dto, actorOf(user));
  }

  @Roles(StaffRole.administrador)
  @Patch(':id/status')
  setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StaffStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.staffService.setActive(id, dto.active, actorOf(user));
  }
}
