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

  @Post('assign')
  assignProduct(
    @Body()
    dto: {
      petId: string;
      medicalProductCatalogId: string;
      status: string;
      appliedDate?: string;
      expirationDate?: string;
    },
  ) {
    return this.medicalProductsService.assignProductToPet({
      petId: dto.petId,
      medicalProductCatalogId: dto.medicalProductCatalogId,
      status: dto.status,
      appliedDate: dto.appliedDate ? new Date(dto.appliedDate) : undefined,
      expirationDate: dto.expirationDate
        ? new Date(dto.expirationDate)
        : undefined,
    });
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
