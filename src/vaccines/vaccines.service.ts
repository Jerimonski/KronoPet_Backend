import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  AuditEntity,
  Vaccine,
  VaccineStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Actor } from '../common/decorators';
import { diff, recordAudit } from '../common/audit';
import { formatDay, fromDbDate, toDbDate } from '../common/dates';
import { toVaccine } from '../common/mappers';
import { VaccineDto } from './dto/vaccine.dto';

const VACCINE_FIELDS = {
  name: 'Vacuna',
  status: 'Estado',
  appliedAt: 'Fecha de aplicación',
  expiresAt: 'Vencimiento',
  description: 'Descripción',
};

// Fechas como texto para comparar y mostrar en la auditoría
const comparable = (v: Vaccine) => ({
  name: v.name,
  status: v.status,
  appliedAt: fromDbDate(v.appliedAt),
  expiresAt: fromDbDate(v.expiresAt),
  description: v.description,
});

@Injectable()
export class VaccinesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(clinicId: string) {
    const vaccines = await this.prisma.vaccine.findMany({
      where: { pet: { tutor: { clinicId } } },
      orderBy: { expiresAt: 'asc' },
    });
    return vaccines.map(toVaccine);
  }

  async create(dto: VaccineDto, actor: Actor) {
    const pet = await this.findPet(dto.petId, actor.clinicId);
    return this.prisma.$transaction(async (tx) => {
      const vaccine = await tx.vaccine.create({ data: this.data(dto) });
      await recordAudit(tx, {
        actorId: actor.id,
        clinicId: actor.clinicId,
        action: AuditAction.crear,
        entity: AuditEntity.vacuna,
        entityId: vaccine.id,
        entityLabel: `${vaccine.name} · ${pet.name}`,
      });
      return toVaccine(vaccine);
    });
  }

  async update(id: string, dto: VaccineDto, actor: Actor) {
    const pet = await this.findPet(dto.petId, actor.clinicId);
    const before = await this.findVaccine(id, actor.clinicId);
    return this.prisma.$transaction(async (tx) => {
      const after = await tx.vaccine.update({
        where: { id },
        data: this.data(dto),
      });
      const day = (value: string | null) => (value ? formatDay(value) : '—');
      await recordAudit(tx, {
        actorId: actor.id,
        clinicId: actor.clinicId,
        action: AuditAction.editar,
        entity: AuditEntity.vacuna,
        entityId: id,
        entityLabel: `${after.name} · ${pet.name}`,
        changes: diff(comparable(before), comparable(after), VACCINE_FIELDS, {
          appliedAt: day,
          expiresAt: day,
        }),
      });
      return toVaccine(after);
    });
  }

  async remove(id: string, actor: Actor) {
    const vaccine = await this.findVaccine(id, actor.clinicId);
    const pet = await this.prisma.pet.findUnique({
      where: { id: vaccine.petId },
    });
    await this.prisma.$transaction(async (tx) => {
      await tx.vaccine.delete({ where: { id } });
      await recordAudit(tx, {
        actorId: actor.id,
        clinicId: actor.clinicId,
        action: AuditAction.eliminar,
        entity: AuditEntity.vacuna,
        entityId: id,
        entityLabel: `${vaccine.name} · ${pet?.name ?? '—'}`,
      });
    });
  }

  private data(dto: VaccineDto) {
    const applied = dto.status === VaccineStatus.aplicada;
    if (applied && dto.appliedAt && dto.expiresAt <= dto.appliedAt) {
      throw new BadRequestException(
        'El vencimiento debe ser posterior a la fecha de aplicación.',
      );
    }
    return {
      petId: dto.petId,
      catalogId: dto.catalogId ?? null,
      name: dto.name.trim(),
      status: dto.status,
      appliedAt: applied && dto.appliedAt ? toDbDate(dto.appliedAt) : null,
      expiresAt: toDbDate(dto.expiresAt),
      description: dto.description?.trim() ?? '',
    };
  }

  private async findPet(id: string, clinicId: string) {
    const pet = await this.prisma.pet.findFirst({
      where: { id, tutor: { clinicId } },
    });
    if (!pet) throw new NotFoundException('La mascota no existe.');
    return pet;
  }

  private async findVaccine(id: string, clinicId: string) {
    const vaccine = await this.prisma.vaccine.findFirst({
      where: { id, pet: { tutor: { clinicId } } },
    });
    if (!vaccine) throw new NotFoundException('La vacuna no existe.');
    return vaccine;
  }
}
