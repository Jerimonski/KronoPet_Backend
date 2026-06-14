import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { MedicalEventsService } from './medical-events.service';
import { CreateMedicalEventDto } from './dto/create-medical-event.dto';

@Controller('medical-events')
export class MedicalEventsController {
  constructor(private readonly medicalEventsService: MedicalEventsService) {}

  @Post()
  create(@Body() createMedicalEventDto: CreateMedicalEventDto) {
    return this.medicalEventsService.create(createMedicalEventDto);
  }

  @Get('pet/:petId')
  findAllByPet(@Param('petId', ParseUUIDPipe) petId: string) {
    return this.medicalEventsService.findAllByPet(petId);
  }

  @Get('owner/:ownerId')
  findAllByOwner(@Param('ownerId', ParseUUIDPipe) ownerId: string) {
    return this.medicalEventsService.findAllByOwner(ownerId);
  }
}
