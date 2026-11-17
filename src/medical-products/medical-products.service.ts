import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Species, VaccineStatus } from '@prisma/client';
import { CreateMedicalProductDto } from './dto/create-medical-products.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { savePetVaccine } from './pet-vaccine';

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

  async findCatalogBySpecies(species?: Species) {
    return this.prisma.medicalProductCatalog.findMany({
      where: species ? { targetSpecies: species } : {},
      orderBy: { name: 'asc' },
    });
  }

  // Cartola sanitaria: todo el catálogo de la especie, con el registro de la
  // mascota si existe o "pendiente" si nunca se le aplicó.
  async findPetCartola(petId: string, clinicId: string) {
    const pet = await this.prisma.pet.findFirst({
      where: { id: petId, tutor: { clinicId } },
    });
    if (!pet) {
      throw new NotFoundException('La mascota especificada no existe');
    }

    const speciesCatalog = await this.prisma.medicalProductCatalog.findMany({
      where: { targetSpecies: pet.species },
      orderBy: { name: 'asc' },
    });

    // Ordenadas de la más reciente a la más antigua: find() toma la última
    const petVaccines = await this.prisma.vaccine.findMany({
      where: { petId },
      include: { catalog: true },
      orderBy: { createdAt: 'desc' },
    });

    const catalogCartola = speciesCatalog.map((catalogItem) => {
      const vaccine = petVaccines.find((v) => v.catalogId === catalogItem.id);

      if (vaccine) {
        return vaccine;
      }

      return {
        id: `temp-${catalogItem.id}`,
        petId: pet.id,
        catalogId: catalogItem.id,
        name: catalogItem.name,
        status: VaccineStatus.pendiente,
        appliedAt: null,
        expiresAt: null,
        description: '',
        createdAt: new Date(),
        catalog: catalogItem,
      };
    });

    // Vacunas fuera del catálogo de la especie (o sin catálogo)
    const speciesCatalogIds = new Set(speciesCatalog.map((c) => c.id));
    const otherVaccines = petVaccines.filter(
      (v) => !v.catalogId || !speciesCatalogIds.has(v.catalogId),
    );

    return [...catalogCartola, ...otherVaccines];
  }

  async assignProductToPet(data: {
    clinicId: string;
    petId: string;
    catalogId: string;
    status: VaccineStatus;
    appliedAt?: Date;
    expiresAt?: Date;
  }) {
    const petExists = await this.prisma.pet.findFirst({
      where: { id: data.petId, tutor: { clinicId: data.clinicId } },
    });
    if (!petExists) {
      throw new NotFoundException('La mascota especificada no existe');
    }

    const catalog = await this.prisma.medicalProductCatalog.findUnique({
      where: { id: data.catalogId },
    });
    if (!catalog) {
      throw new NotFoundException(
        'El producto del catálogo especificado no existe',
      );
    }

    if (catalog.targetSpecies !== petExists.species) {
      throw new BadRequestException(
        `Este producto está catalogado exclusivamente para la especie: ${catalog.targetSpecies}`,
      );
    }

    const appliedAt =
      data.appliedAt ??
      (data.status === VaccineStatus.aplicada ? new Date() : null);

    let expiresAt = data.expiresAt;
    if (!expiresAt && catalog.daysToReinforce) {
      expiresAt = new Date(appliedAt ?? new Date());
      expiresAt.setDate(expiresAt.getDate() + catalog.daysToReinforce);
    }
    if (!expiresAt) {
      throw new BadRequestException(
        'Debes indicar expiresAt: el producto no tiene días de refuerzo definidos',
      );
    }

    return savePetVaccine(this.prisma, {
      petId: data.petId,
      catalogId: catalog.id,
      name: catalog.name,
      status: data.status,
      appliedAt,
      expiresAt,
    });
  }
}
