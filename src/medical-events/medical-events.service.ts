import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateMedicalEventDto } from './dto/create-medical-event.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { Actor } from '../common/decorators';
import {
  AuditAction,
  AuditEntity,
  Prisma,
  StaffRole,
  VaccineStatus,
} from '@prisma/client';
import { recordAudit } from '../common/audit';
import { toDbDate, todayISO } from '../common/dates';
import { toMedicalEvent } from '../common/mappers';
import { savePetVaccine } from '../medical-products/pet-vaccine';

const VET_SELECT = { id: true, name: true, specialty: true } as const;

@Injectable()
export class MedicalEventsService {
  constructor(private readonly prisma: PrismaService) {}

  // Panel: todas las fichas, más recientes primero
  async findAll(clinicId: string) {
    const events = await this.prisma.medicalEvent.findMany({
      where: { pet: { tutor: { clinicId } } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    return events.map(toMedicalEvent);
  }

  async create(createMedicalEventDto: CreateMedicalEventDto, actor: Actor) {
    const { petId, vetId, date, followUpDate, appliedProductId, ...eventData } =
      createMedicalEventDto;

    const petExists = await this.prisma.pet.findFirst({
      where: { id: petId, tutor: { clinicId: actor.clinicId } },
    });
    if (!petExists) {
      throw new NotFoundException('La mascota no existe.');
    }

    const vet = await this.prisma.staffUser.findFirst({
      where: { id: vetId, clinicId: actor.clinicId },
    });
    if (!vet || !vet.active || vet.role !== StaffRole.veterinario) {
      throw new BadRequestException(
        'El veterinario especificado no existe o no está habilitado',
      );
    }

    const eventDate = toDbDate(date ?? todayISO());
    const followUp = followUpDate ? toDbDate(followUpDate) : null;

    // Mismo criterio que el CHECK chk_followup de la base, para responder 400 y no 500
    if (
      followUp &&
      followUp.toISOString().slice(0, 10) <=
        eventDate.toISOString().slice(0, 10)
    ) {
      throw new BadRequestException(
        'La fecha del próximo control debe ser posterior a la de la atención',
      );
    }

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

        if (productCatalog.targetSpecies !== petExists.species) {
          throw new BadRequestException(
            `Este producto está catalogado exclusivamente para la especie: ${productCatalog.targetSpecies}`,
          );
        }
      }

      const newEvent = await tx.medicalEvent.create({
        data: {
          ...eventData,
          date: eventDate,
          followUpDate: followUp,
          petId,
          vetId,
        },
      });

      if (
        productCatalog?.requiresReinforcement &&
        productCatalog.daysToReinforce
      ) {
        const expiresAt = new Date(eventDate);
        expiresAt.setUTCDate(
          expiresAt.getUTCDate() + productCatalog.daysToReinforce,
        );

        await savePetVaccine(tx, {
          petId,
          catalogId: productCatalog.id,
          name: productCatalog.name,
          status: VaccineStatus.aplicada,
          appliedAt: eventDate,
          expiresAt,
        });
      }

      await recordAudit(tx, {
        actorId: actor.id,
        clinicId: actor.clinicId,
        action: AuditAction.crear,
        entity: AuditEntity.ficha,
        entityId: newEvent.id,
        entityLabel: `${newEvent.title} · ${petExists.name}`,
      });

      return toMedicalEvent(newEvent);
    });
  }

  async findAllByPet(petId: string, clinicId: string) {
    const petExists = await this.prisma.pet.findFirst({
      where: { id: petId, tutor: { clinicId } },
    });
    if (!petExists) {
      throw new NotFoundException('La mascota especificada no existe');
    }

    return this.prisma.medicalEvent.findMany({
      where: { petId },
      include: {
        vet: { select: VET_SELECT },
        attachments: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async findAllByTutor(tutorId: string, clinicId: string) {
    const tutorExists = await this.prisma.tutor.findFirst({
      where: { id: tutorId, clinicId },
    });
    if (!tutorExists) {
      throw new NotFoundException('El tutor especificado no existe');
    }

    return this.prisma.medicalEvent.findMany({
      where: {
        pet: { tutorId },
      },
      include: {
        pet: {
          select: {
            name: true,
            species: true,
            breed: true,
          },
        },
        vet: { select: VET_SELECT },
      },
      orderBy: { date: 'desc' },
    });
  }
}
