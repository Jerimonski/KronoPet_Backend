import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { PetsService } from './pets.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { PetAlertDto } from './dto/pet-alert.dto';
import { PetPhotoDto } from './dto/pet-photo.dto';
import {
  actorOf,
  AuthUser,
  CurrentUser,
  StaffOnly,
} from '../common/decorators';

@Controller('pets')
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  @StaffOnly()
  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.petsService.findAll(user.clinicId!);
  }

  @StaffOnly()
  @Post()
  create(@Body() createPetDto: CreatePetDto, @CurrentUser() user: AuthUser) {
    return this.petsService.create(createPetDto, actorOf(user));
  }

  @StaffOnly()
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePetDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.petsService.update(id, dto, actorOf(user));
  }

  @StaffOnly()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.petsService.remove(id, actorOf(user));
  }

  @StaffOnly()
  @Post(':id/alerts')
  addAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PetAlertDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.petsService.addAlert(id, dto, actorOf(user));
  }

  @StaffOnly()
  @Delete(':id/alerts/:alertId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('alertId', ParseUUIDPipe) alertId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.petsService.removeAlert(id, alertId, actorOf(user));
  }

  // App móvil: un tutor solo ve sus propias mascotas
  @Get('tutor/:tutorId')
  findByTutor(
    @Param('tutorId', ParseUUIDPipe) tutorId: string,
    @CurrentUser() user: AuthUser,
  ) {
    if (user.role === 'tutor' && user.sub !== tutorId) {
      throw new ForbiddenException('No tienes permiso para esta acción.');
    }
    return this.petsService.findAllByTutor(tutorId, user.clinicId!);
  }

  // App móvil: el tutor cambia la foto de su mascota (la clínica también puede)
  @Post(':id/photo')
  createPhotoUpload(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PetPhotoDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.petsService.createPhotoUpload(id, dto.contentType, {
      ...actorOf(user),
      role: user.role,
    });
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    const pet = await this.petsService.findOneWithDetails(id, user.clinicId!);
    if (user.role === 'tutor' && pet.tutorId !== user.sub) {
      throw new ForbiddenException('No tienes permiso para esta acción.');
    }
    return pet;
  }
}
