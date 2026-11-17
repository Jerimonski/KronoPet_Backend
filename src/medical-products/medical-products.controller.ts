import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  ParseEnumPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Species } from '@prisma/client';
import { MedicalProductsService } from './medical-products.service';
import { CreateMedicalProductDto } from './dto/create-medical-products.dto';
import { AssignMedicalProductDto } from './dto/assign-medical-product.dto';
import { AuthUser, CurrentUser, StaffOnly } from '../common/decorators';

@Controller('medical-products')
export class MedicalProductsController {
  constructor(
    private readonly medicalProductsService: MedicalProductsService,
  ) {}

  @StaffOnly()
  @Post()
  create(@Body() createMedicalProductDto: CreateMedicalProductDto) {
    return this.medicalProductsService.create(createMedicalProductDto);
  }

  @StaffOnly()
  @Post('assign')
  assignProduct(
    @Body() dto: AssignMedicalProductDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.medicalProductsService.assignProductToPet({
      clinicId: user.clinicId!,
      petId: dto.petId,
      catalogId: dto.catalogId,
      status: dto.status,
      appliedAt: dto.appliedAt ? new Date(dto.appliedAt) : undefined,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });
  }

  @Get('catalog')
  findCatalog(
    @Query('species', new ParseEnumPipe(Species, { optional: true }))
    species?: Species,
  ) {
    return this.medicalProductsService.findCatalogBySpecies(species);
  }

  @Get('pet/:petId')
  findPetCartola(
    @Param('petId', ParseUUIDPipe) petId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.medicalProductsService.findPetCartola(petId, user.clinicId!);
  }
}
