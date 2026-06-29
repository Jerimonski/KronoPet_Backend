import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePetDto } from './dto/create-pet.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPetDto: CreatePetDto) {
    const { ownerId, birthdate, weight, ...petData } = createPetDto;

    const ownerExists = await this.prisma.user.findUnique({
      where: { id: ownerId },
    });
    if (!ownerExists) {
      throw new NotFoundException('El dueño especificado no existe');
    }

    return this.prisma.pet.create({
      data: {
        ...petData,
        birthdate: new Date(birthdate),
        weight: weight ?? null, // 🌟 AGREGADO: Almacena el peso si viene en el DTO
        ownerId,
      },
    });
  }

  // 🌟 MODIFICADO: Ahora incluye los productos/vacunas para que el Home de Flutter no marque 0
  async findAllByOwner(ownerId: string) {
    return this.prisma.pet.findMany({
      where: { ownerId },
      include: {
        medicalProducts: {
          include: {
            medicalProductCatalog: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneWithDetails(id: string) {
    const pet = await this.prisma.pet.findUnique({
      where: { id },
      include: {
        medicalEvents: {
          orderBy: { date: 'desc' },
        },
        medicalProducts: {
          include: {
            medicalProductCatalog: true,
          },
          orderBy: { expirationDate: 'asc' },
        },
      },
    });

    if (!pet) {
      throw new NotFoundException('La mascota no fue encontrada');
    }

    return pet;
  }
}
