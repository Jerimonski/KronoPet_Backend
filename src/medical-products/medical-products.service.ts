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
}
