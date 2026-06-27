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
    const petExists = await this.prisma.pet.findUnique({
      where: { id: petId },
    });
    if (!petExists) {
      throw new NotFoundException('La mascota especificada no existe');
    }

    return this.prisma.petMedicalProduct.findMany({
      where: { petId },
      include: {
        medicalProductCatalog: true,
      },
      orderBy: { expirationDate: 'asc' },
    });
  }

  // 🌟 NUEVO MÉTODO: Permite insertar registros en la tabla relacional intermedia
  async assignProductToPet(data: {
    petId: string;
    medicalProductCatalogId: string;
    status: string;
    appliedDate?: Date;
    expirationDate?: Date;
  }) {
    // 1. Validar que la mascota exista antes de asociar
    const petExists = await this.prisma.pet.findUnique({
      where: { id: data.petId },
    });
    if (!petExists) {
      throw new NotFoundException('La mascota especificada no existe');
    }

    // 2. Validar que el producto biológico o vacuna exista en el catálogo maestro
    const catalogExists = await this.prisma.medicalProductCatalog.findUnique({
      where: { id: data.medicalProductCatalogId },
    });
    if (!catalogExists) {
      throw new NotFoundException(
        'El producto del catálogo especificado no existe',
      );
    }

    // 3. Crear el registro en la tabla pivote que estaba vacía
    return this.prisma.petMedicalProduct.create({
      data: {
        petId: data.petId,
        medicalProductCatalogId: data.medicalProductCatalogId,
        status: data.status,
        appliedDate: data.appliedDate || null,
        expirationDate: data.expirationDate || null,
      },
      include: {
        medicalProductCatalog: true, // Retorna el objeto completo estructurado
      },
    });
  }
}
