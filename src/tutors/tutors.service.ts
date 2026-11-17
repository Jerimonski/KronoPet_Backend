import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, AuditEntity, Tutor } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { Actor } from '../common/decorators';
import { diff, recordAudit } from '../common/audit';
import { toTutor } from '../common/mappers';
import { cleanRut, formatRut } from '../common/rut';
import { TutorDto } from './dto/tutor.dto';

const TUTOR_FIELDS: Partial<Record<keyof Tutor, string>> = {
  name: 'Nombre',
  rut: 'RUT',
  email: 'Correo',
  phone: 'Teléfono',
  address: 'Dirección',
};

@Injectable()
export class TutorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(clinicId: string) {
    const tutors = await this.prisma.tutor.findMany({
      where: { clinicId },
      orderBy: { createdAt: 'desc' },
    });
    return tutors.map(toTutor);
  }

  async create(dto: TutorDto, actor: Actor) {
    await this.assertUnique(dto);
    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, 10)
      : null;

    return this.prisma.$transaction(async (tx) => {
      const tutor = await tx.tutor.create({
        data: { ...this.data(dto), passwordHash, clinicId: actor.clinicId },
      });
      await recordAudit(tx, {
        actorId: actor.id,
        clinicId: actor.clinicId,
        action: AuditAction.crear,
        entity: AuditEntity.tutor,
        entityId: tutor.id,
        entityLabel: tutor.name,
      });
      return toTutor(tutor);
    });
  }

  async update(id: string, dto: TutorDto, actor: Actor) {
    const before = await this.prisma.tutor.findFirst({
      where: { id, clinicId: actor.clinicId },
    });
    if (!before) throw new NotFoundException('El tutor no existe.');
    await this.assertUnique(dto, id);
    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, 10)
      : undefined;

    return this.prisma.$transaction(async (tx) => {
      const after = await tx.tutor.update({
        where: { id },
        data: { ...this.data(dto), passwordHash },
      });
      await recordAudit(tx, {
        actorId: actor.id,
        clinicId: actor.clinicId,
        action: AuditAction.editar,
        entity: AuditEntity.tutor,
        entityId: id,
        entityLabel: after.name,
        changes: diff(before, after, TUTOR_FIELDS),
      });
      return toTutor(after);
    });
  }

  private data(dto: TutorDto) {
    return {
      name: dto.name.trim(),
      rut: formatRut(dto.rut),
      email: dto.email.trim(),
      phone: dto.phone.trim(),
      address: dto.address.trim(),
    };
  }

  // Correo y RUT son únicos en toda la plataforma (login de la app móvil)
  private async assertUnique(dto: TutorDto, ignoreId?: string) {
    const others = await this.prisma.tutor.findMany({
      where: ignoreId ? { id: { not: ignoreId } } : {},
      select: { email: true, rut: true },
    });
    if (others.some((t) => t.email.toLowerCase() === dto.email.toLowerCase())) {
      throw new ConflictException(
        'Ya existe un tutor con ese correo electrónico.',
      );
    }
    if (others.some((t) => cleanRut(t.rut) === cleanRut(dto.rut))) {
      throw new ConflictException('Ya existe un tutor con ese RUT.');
    }
  }
}
