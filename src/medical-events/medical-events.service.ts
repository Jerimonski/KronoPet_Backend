import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateMedicalEventDto } from './dto/create-medical-event.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class MedicalEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createMedicalEventDto: CreateMedicalEventDto) {
    const { petId, date, appliedProductId, category, ...eventData } =
      createMedicalEventDto;

    const petExists = await this.prisma.pet.findUnique({
      where: { id: petId },
    });
    if (!petExists) {
      throw new NotFoundException('La mascota especificada no existe');
    }

    const eventDate = date ? new Date(date) : new Date();

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let productCatalog: Prisma.MedicalProductCatalogGetPayload<object> | null =
        null;

      if (appliedProductId) {
        productCatalog = await tx.medicalProductCatalog.findUnique({
          where: { id: appliedProductId },
        });

        if (!productCatalog) {
          throw new NotFoundException(
            'El producto clínico seleccionado del catálogo no existe',
          );
        }

        if (
          productCatalog.targetSpecies.toLowerCase() !==
          petExists.species.toLowerCase()
        ) {
          throw new BadRequestException(
            `Este producto está catalogado exclusivamente para la especie: ${productCatalog.targetSpecies}`,
          );
        }
      }

      const newEvent = await tx.medicalEvent.create({
        data: {
          ...eventData,
          category,
          date: eventDate,
          petId,
          appliedProductId: appliedProductId || null,
        },
      });

      if (
        productCatalog?.requiresReinforcement &&
        productCatalog.daysToReinforce
      ) {
        const expirationDate = new Date(eventDate);
        expirationDate.setDate(
          expirationDate.getDate() + productCatalog.daysToReinforce,
        );

        await tx.petMedicalProduct.upsert({
          where: {
            petId_medicalProductCatalogId: {
              petId,
              medicalProductCatalogId: appliedProductId!,
            },
          },
          update: {
            status: 'Aplicada',
            appliedDate: eventDate,
            expirationDate: expirationDate,
          },
          create: {
            petId,
            medicalProductCatalogId: appliedProductId!,
            status: 'Aplicada',
            appliedDate: eventDate,
            expirationDate: expirationDate,
          },
        });
      }

      return newEvent;
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
      include: {
        appliedProduct: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async findAllByOwner(ownerId: string) {
    const ownerExists = await this.prisma.user.findUnique({
      where: { id: ownerId },
    });
    if (!ownerExists) {
      throw new NotFoundException('El tutor especificado no existe');
    }

    return this.prisma.medicalEvent.findMany({
      where: {
        pet: {
          ownerId: ownerId,
        },
      },
      include: {
        pet: {
          select: {
            name: true,
            species: true,
            breed: true,
          },
        },
        appliedProduct: true,
      },
      orderBy: { date: 'desc' },
    });
  }
}
