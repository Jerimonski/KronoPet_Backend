import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateMedicalEventDto } from './dto/create-medical-event.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MedicalEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createMedicalEventDto: CreateMedicalEventDto) {
    const { petId, date, ...eventData } = createMedicalEventDto;

    const petExists = await this.prisma.pet.findUnique({
      where: { id: petId },
    });
    if (!petExists) {
      throw new NotFoundException('La mascota especificada no existe');
    }

    return this.prisma.medicalEvent.create({
      data: {
        ...eventData,
        date: date ? new Date(date) : new Date(),
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

    return this.prisma.medicalEvent.findMany({
      where: { petId },
      orderBy: { date: 'desc' },
    });
  }
}
