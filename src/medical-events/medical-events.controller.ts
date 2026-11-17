import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { MedicalEventsService } from './medical-events.service';
import { CreateMedicalEventDto } from './dto/create-medical-event.dto';
import {
  actorOf,
  AuthUser,
  CurrentUser,
  StaffOnly,
} from '../common/decorators';

// Las fichas son inmutables: no hay PATCH ni DELETE
@Controller('medical-events')
export class MedicalEventsController {
  constructor(private readonly medicalEventsService: MedicalEventsService) {}

  @StaffOnly()
  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.medicalEventsService.findAll(user.clinicId!);
  }

  @StaffOnly()
  @Post()
  create(
    @Body() createMedicalEventDto: CreateMedicalEventDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.medicalEventsService.create(
      createMedicalEventDto,
      actorOf(user),
    );
  }

  @StaffOnly()
  @Get('pet/:petId')
  findAllByPet(
    @Param('petId', ParseUUIDPipe) petId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.medicalEventsService.findAllByPet(petId, user.clinicId!);
  }

  // App móvil: un tutor solo ve el historial de sus mascotas
  @Get('tutor/:tutorId')
  findAllByTutor(
    @Param('tutorId', ParseUUIDPipe) tutorId: string,
    @CurrentUser() user: AuthUser,
  ) {
    if (user.role === 'tutor' && user.sub !== tutorId) {
      throw new ForbiddenException('No tienes permiso para esta acción.');
    }
    return this.medicalEventsService.findAllByTutor(tutorId, user.clinicId!);
  }
}
