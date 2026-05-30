import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePetDto } from './dto/create-pet.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPetDto: CreatePetDto) {
    const { ownerId, birthdate, ...petData } = createPetDto;
    const ownerExists = await this.prisma.user.findUnique({
      where: { id: ownerId },
    });
    if (!ownerExists) {
      throw new NotFoundException('El dueño especificado no existe');
    }

    return this.prisma.pet.create({
      data: {
        ...petData,
        birthdate: birthdate ? new Date(birthdate) : null,
        ownerId,
      },
    });
  }

  async findAllByOwner(ownerId: string) {
    return this.prisma.pet.findMany({
      where: { ownerId },
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
        vaccines: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!pet) {
      throw new NotFoundException('La mascota no fue encontrada');
    }

    return pet;
  }
}
