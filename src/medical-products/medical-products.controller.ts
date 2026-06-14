import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { MedicalProductsService } from './medical-products.service';
import { CreateMedicalProductDto } from './dto/create-medical-products.dto';

@Controller('medical-products')
export class MedicalProductsController {
  constructor(
    private readonly medicalProductsService: MedicalProductsService,
  ) {}

  @Post()
  create(@Body() createMedicalProductDto: CreateMedicalProductDto) {
    return this.medicalProductsService.create(createMedicalProductDto);
  }

  @Get('catalog')
  findCatalog(@Query('species') species?: string) {
    return this.medicalProductsService.findCatalogBySpecies(species);
  }

  @Get('pet/:petId')
  findPetCartola(@Param('petId', ParseUUIDPipe) petId: string) {
    return this.medicalProductsService.findPetCartola(petId);
  }
}
