// src/pets/pets.controller.ts
import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { PetsService } from './pets.service';
import { CreatePetDto } from './dto/create-pet.dto';

@Controller('pets')
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  @Post()
  create(@Body() createPetDto: CreatePetDto) {
    return this.petsService.create(createPetDto);
  }

  @Get('owner/:ownerId')
  findByOwner(@Param('ownerId') ownerId: string) {
    return this.petsService.findAllByOwner(ownerId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.petsService.findOneWithDetails(id);
  }
}
