import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, AuditEntity, Pet, PetAlertType } from '@prisma/client';
import { CreatePetDto } from './dto/create-pet.dto';
import { PetAlertDto } from './dto/pet-alert.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { Actor } from '../common/decorators';
import { diff, recordAudit } from '../common/audit';
import { fromDbDate, formatDay, toDbDate } from '../common/dates';
import { toPet } from '../common/mappers';
import { PetPhotosService } from './pet-photos.service';

const PET_FIELDS: Partial<Record<keyof Pet, string>> = {
  name: 'Nombre',
  species: 'Especie',
  breed: 'Raza',
  sex: 'Sexo',
  birthDate: 'Fecha de nacimiento',
  reproductiveStatus: 'Estado reproductivo',
  tutorId: 'Tutor',
};

const ALERT_LABELS: Record<PetAlertType, string> = {
  alergia: 'Alergia',
  condicion: 'Condición',
  comportamiento: 'Comportamiento',
  otra: 'Otra',
};

const petLabel = (pet: Pick<Pet, 'name' | 'species'>) =>
  `${pet.name} (${pet.species})`;

@Injectable()
export class PetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly photos: PetPhotosService,
  ) {}

  // --- Panel de la clínica ---

  async findAll(clinicId: string) {
    const pets = await this.prisma.pet.findMany({
      where: { tutor: { clinicId } },
      include: { alerts: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return pets.map(toPet);
  }

  async create(createPetDto: CreatePetDto, actor: Actor) {
    await this.assertTutorExists(createPetDto.tutorId, actor.clinicId);

    return this.prisma.$transaction(async (tx) => {
      const pet = await tx.pet.create({ data: this.data(createPetDto) });
      await recordAudit(tx, {
        actorId: actor.id,
        clinicId: actor.clinicId,
        action: AuditAction.crear,
        entity: AuditEntity.mascota,
        entityId: pet.id,
        entityLabel: petLabel(pet),
      });
      return toPet(pet);
    });
  }

  async update(id: string, dto: CreatePetDto, actor: Actor) {
    const before = await this.findPet(id, actor.clinicId);
    await this.assertTutorExists(dto.tutorId, actor.clinicId);
    const tutorName = async (tutorId: string) =>
      (await this.prisma.tutor.findUnique({ where: { id: tutorId } }))?.name ??
      tutorId;
    const tutorNames = {
      [before.tutorId]: await tutorName(before.tutorId),
      [dto.tutorId]: await tutorName(dto.tutorId),
    };

    return this.prisma.$transaction(async (tx) => {
      const after = await tx.pet.update({
        where: { id },
        data: this.data(dto),
        include: { alerts: { orderBy: { createdAt: 'asc' } } },
      });
      await recordAudit(tx, {
        actorId: actor.id,
        clinicId: actor.clinicId,
        action: AuditAction.editar,
        entity: AuditEntity.mascota,
        entityId: id,
        entityLabel: petLabel(after),
        changes: diff(
          { ...before, birthDate: fromDbDate(before.birthDate) },
          { ...after, birthDate: fromDbDate(after.birthDate) },
          PET_FIELDS as never,
          {
            tutorId: (value: string) => tutorNames[value],
            birthDate: (value: string) => formatDay(value),
          },
        ),
      });
      return toPet(after);
    });
  }

  // Borra en cascada su historial, vacunas, adjuntos y recordatorios (FK onDelete: Cascade)
  async remove(id: string, actor: Actor) {
    const pet = await this.findPet(id, actor.clinicId);
    await this.prisma.$transaction(async (tx) => {
      await tx.pet.delete({ where: { id } });
      await recordAudit(tx, {
        actorId: actor.id,
        clinicId: actor.clinicId,
        action: AuditAction.eliminar,
        entity: AuditEntity.mascota,
        entityId: id,
        entityLabel: petLabel(pet),
      });
    });
  }

  async addAlert(petId: string, dto: PetAlertDto, actor: Actor) {
    const pet = await this.findPet(petId, actor.clinicId);
    return this.prisma.$transaction(async (tx) => {
      const alert = await tx.petAlert.create({
        data: {
          petId,
          type: dto.type,
          description: dto.description.trim(),
          createdBy: actor.id,
        },
      });
      await recordAudit(tx, {
        actorId: actor.id,
        clinicId: actor.clinicId,
        action: AuditAction.crear,
        entity: AuditEntity.alerta,
        entityId: alert.id,
        entityLabel: `${ALERT_LABELS[alert.type]}: ${alert.description} · ${pet.name}`,
      });
      return {
        id: alert.id,
        type: alert.type,
        description: alert.description,
        createdAt: alert.createdAt.toISOString(),
        createdBy: alert.createdBy,
      };
    });
  }

  async removeAlert(petId: string, alertId: string, actor: Actor) {
    const pet = await this.findPet(petId, actor.clinicId);
    const alert = await this.prisma.petAlert.findFirst({
      where: { id: alertId, petId },
    });
    if (!alert) throw new NotFoundException('La alerta no existe.');
    await this.prisma.$transaction(async (tx) => {
      await tx.petAlert.delete({ where: { id: alertId } });
      await recordAudit(tx, {
        actorId: actor.id,
        clinicId: actor.clinicId,
        action: AuditAction.eliminar,
        entity: AuditEntity.alerta,
        entityId: alertId,
        entityLabel: `${ALERT_LABELS[alert.type]}: ${alert.description} · ${pet.name}`,
      });
    });
  }

  private data(dto: CreatePetDto) {
    return {
      name: dto.name.trim(),
      species: dto.species,
      breed: dto.breed.trim(),
      sex: dto.sex,
      birthDate: dto.birthDate ? toDbDate(dto.birthDate) : null,
      reproductiveStatus: dto.reproductiveStatus,
      tutorId: dto.tutorId,
    };
  }

  private async findPet(id: string, clinicId: string) {
    const pet = await this.prisma.pet.findFirst({
      where: { id, tutor: { clinicId } },
    });
    if (!pet) throw new NotFoundException('La mascota no existe.');
    return pet;
  }

  private async assertTutorExists(tutorId: string, clinicId: string) {
    const tutor = await this.prisma.tutor.findFirst({
      where: { id: tutorId, clinicId },
    });
    if (!tutor) {
      throw new BadRequestException(
        'La mascota debe estar asociada a un tutor válido.',
      );
    }
  }

  // --- App móvil del tutor ---

  // Incluye las vacunas para que el Home de Flutter no marque 0
  async findAllByTutor(tutorId: string, clinicId: string) {
    const pets = await this.prisma.pet.findMany({
      where: { tutorId, tutor: { clinicId } },
      include: {
        vaccines: {
          include: { catalog: true },
          orderBy: { expiresAt: 'asc' },
        },
        alerts: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return pets.map((pet) => this.photos.withPhoto(pet));
  }

  // App móvil: prepara la subida de la foto de una mascota del tutor
  async createPhotoUpload(
    petId: string,
    contentType: string,
    user: Actor & { role: string },
  ) {
    const pet = await this.findPet(petId, user.clinicId);
    // `Actor.id` es el sub del token: para un tutor, su propio id
    if (user.role === 'tutor' && pet.tutorId !== user.id) {
      throw new ForbiddenException('No tienes permiso para esta acción.');
    }
    return this.photos.createUpload(pet.id, contentType);
  }

  async findOneWithDetails(id: string, clinicId: string) {
    const pet = await this.prisma.pet.findFirst({
      where: { id, tutor: { clinicId } },
      include: {
        tutor: { omit: { passwordHash: true } },
        alerts: { orderBy: { createdAt: 'desc' } },
        medicalEvents: {
          include: { vet: { select: { id: true, name: true } } },
          orderBy: { date: 'desc' },
        },
        vaccines: {
          include: { catalog: true },
          orderBy: { expiresAt: 'asc' },
        },
      },
    });

    if (!pet) {
      throw new NotFoundException('La mascota no fue encontrada');
    }

    return this.photos.withPhoto(pet);
  }
}
