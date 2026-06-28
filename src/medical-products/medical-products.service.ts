import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CreateMedicalProductDto } from './dto/create-medical-products.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MedicalProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createMedicalProductDto: CreateMedicalProductDto) {
    const { name } = createMedicalProductDto;

    const productExists = await this.prisma.medicalProductCatalog.findUnique({
      where: { name },
    });
    if (productExists) {
      throw new ConflictException(
        'Ya existe un fármaco o vacuna registrado con ese nombre',
      );
    }

    return this.prisma.medicalProductCatalog.create({
      data: createMedicalProductDto,
    });
  }

  async findCatalogBySpecies(species?: string) {
    return this.prisma.medicalProductCatalog.findMany({
      where: species
        ? { targetSpecies: { equals: species, mode: 'insensitive' } }
        : {},
      orderBy: { name: 'asc' },
    });
  }

  async findPetCartola(petId: string) {
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
    });
    if (!pet) {
      throw new NotFoundException('La mascota especificada no existe');
    }

    const speciesCatalog = await this.prisma.medicalProductCatalog.findMany({
      where: {
        targetSpecies: { equals: pet.species, mode: 'insensitive' },
      },
      orderBy: { name: 'asc' },
    });

    const petProducts = await this.prisma.petMedicalProduct.findMany({
      where: { petId },
      include: { medicalProductCatalog: true },
    });

    const fullCartola = speciesCatalog.map((catalogItem) => {
      const userRecord = petProducts.find(
        (pp) => pp.medicalProductCatalogId === catalogItem.id,
      );

      if (userRecord) {
        return {
          id: userRecord.id,
          petId: userRecord.petId,
          medicalProductCatalogId: userRecord.medicalProductCatalogId,
          status: userRecord.status,
          appliedDate: userRecord.appliedDate,
          expirationDate: userRecord.expirationDate,
          createdAt: userRecord.createdAt,
          updatedAt: userRecord.updatedAt,
          medicalProductCatalog: catalogItem,
        };
      }

      return {
        id: `temp-${catalogItem.id}`,
        petId: pet.id,
        medicalProductCatalogId: catalogItem.id,
        status: 'Pendiente',
        appliedDate: null,
        expirationDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        medicalProductCatalog: catalogItem,
      };
    });

    return fullCartola;
  }

  async assignProductToPet(data: {
    petId: string;
    medicalProductCatalogId: string;
    status: string;
    appliedDate?: Date;
    expirationDate?: Date;
  }) {
    const petExists = await this.prisma.pet.findUnique({
      where: { id: data.petId },
    });
    if (!petExists) {
      throw new NotFoundException('La mascota especificada no existe');
    }

    const catalogExists = await this.prisma.medicalProductCatalog.findUnique({
      where: { id: data.medicalProductCatalogId },
    });
    if (!catalogExists) {
      throw new NotFoundException(
        'El producto del catálogo especificado no existe',
      );
    }

    return this.prisma.petMedicalProduct.create({
      data: {
        petId: data.petId,
        medicalProductCatalogId: data.medicalProductCatalogId,
        status: data.status,
        appliedDate: data.appliedDate || null,
        expirationDate: data.expirationDate || null,
      },
      include: {
        medicalProductCatalog: true,
      },
    });
  }
}
