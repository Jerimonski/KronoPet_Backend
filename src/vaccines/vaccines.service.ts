import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateVaccineDto } from './dto/create-vaccine.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VaccinesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createVaccineDto: CreateVaccineDto) {
    const { petId, appliedDate, expirationDate, ...vaccineData } =
      createVaccineDto;

    const petExists = await this.prisma.pet.findUnique({
      where: { id: petId },
    });
    if (!petExists) {
      throw new NotFoundException('La mascota especificada no existe');
    }

    return this.prisma.vaccine.create({
      data: {
        ...vaccineData,
        appliedDate: appliedDate ? new Date(appliedDate) : null,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        petId,
      },
    });
  }

  async findAllByPet(petId: string) {
    const petExists = await this.prisma.pet.findUnique({
      where: { id: petId },
    });
    if (!petExists) {
      throw new NotFoundException('La mascota especificada no existe');
    }

    return this.prisma.vaccine.findMany({
      where: { petId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
