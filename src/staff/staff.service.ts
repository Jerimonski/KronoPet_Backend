import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  AuditEntity,
  Prisma,
  StaffRole,
  StaffUser,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { Actor } from '../common/decorators';
import { diff, recordAudit } from '../common/audit';
import { toStaff } from '../common/mappers';
import { cleanRut, formatRut } from '../common/rut';
import { StaffDto } from './dto/staff.dto';

const STAFF_FIELDS: Partial<Record<keyof StaffUser, string>> = {
  name: 'Nombre',
  rut: 'RUT',
  email: 'Correo',
  phone: 'Teléfono',
  role: 'Rol',
  specialty: 'Especialidad',
};

const ROLE_LABELS: Record<StaffRole, string> = {
  veterinario: 'Veterinario/a',
  administrador: 'Administrador/a',
};

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(clinicId: string) {
    const staff = await this.prisma.staffUser.findMany({
      where: { clinicId },
      orderBy: { createdAt: 'asc' },
    });
    return staff.map(toStaff);
  }

  async create(dto: StaffDto, actor: Actor) {
    if (!dto.password) {
      throw new BadRequestException(
        'La contraseña debe tener al menos 8 caracteres.',
      );
    }
    await this.assertUnique(dto);
    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.$transaction(async (tx) => {
      const member = await tx.staffUser.create({
        data: { ...this.data(dto), passwordHash, clinicId: actor.clinicId },
      });
      await recordAudit(tx, {
        actorId: actor.id,
        clinicId: actor.clinicId,
        action: AuditAction.crear,
        entity: AuditEntity.equipo,
        entityId: member.id,
        entityLabel: member.name,
      });
      return toStaff(member);
    });
  }

  async update(id: string, dto: StaffDto, actor: Actor) {
    const before = await this.find(id, actor.clinicId);
    await this.assertUnique(dto, id);
    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, 10)
      : undefined;

    return this.prisma.$transaction(async (tx) => {
      const after = await tx.staffUser.update({
        where: { id },
        data: { ...this.data(dto), passwordHash },
      });
      await this.assertKeepsAnAdmin(tx, actor.clinicId);
      await recordAudit(tx, {
        actorId: actor.id,
        clinicId: actor.clinicId,
        action: AuditAction.editar,
        entity: AuditEntity.equipo,
        entityId: id,
        entityLabel: after.name,
        changes: diff(before, after, STAFF_FIELDS, {
          role: (r) => ROLE_LABELS[r],
        }),
      });
      return toStaff(after);
    });
  }

  // Deshabilitar no borra: sus fichas siguen firmadas por esa persona
  async setActive(id: string, active: boolean, actor: Actor) {
    await this.find(id, actor.clinicId);
    return this.prisma.$transaction(async (tx) => {
      const after = await tx.staffUser.update({
        where: { id },
        data: { active, deactivatedAt: active ? null : new Date() },
      });
      await this.assertKeepsAnAdmin(tx, actor.clinicId);
      await recordAudit(tx, {
        actorId: actor.id,
        clinicId: actor.clinicId,
        action: active ? AuditAction.habilitar : AuditAction.deshabilitar,
        entity: AuditEntity.equipo,
        entityId: id,
        entityLabel: after.name,
      });
      return toStaff(after);
    });
  }

  private data(dto: StaffDto) {
    return {
      name: dto.name.trim(),
      rut: formatRut(dto.rut),
      email: dto.email.trim(),
      phone: dto.phone.trim(),
      role: dto.role,
      specialty: dto.specialty.trim(),
    };
  }

  private async find(id: string, clinicId: string) {
    const member = await this.prisma.staffUser.findFirst({
      where: { id, clinicId },
    });
    if (!member) throw new NotFoundException('El usuario no existe.');
    return member;
  }

  // Correo y RUT son únicos en toda la plataforma (el login no pide la clínica)
  private async assertUnique(dto: StaffDto, ignoreId?: string) {
    const others = await this.prisma.staffUser.findMany({
      where: ignoreId ? { id: { not: ignoreId } } : {},
      select: { email: true, rut: true },
    });
    if (others.some((s) => s.email.toLowerCase() === dto.email.toLowerCase())) {
      throw new ConflictException(
        'Ya existe un usuario del equipo con ese correo electrónico.',
      );
    }
    if (others.some((s) => cleanRut(s.rut) === cleanRut(dto.rut))) {
      throw new ConflictException(
        'Ya existe un usuario del equipo con ese RUT.',
      );
    }
  }

  /** Siempre debe quedar al menos un administrador activo en la clínica (si no, se revierte). */
  private async assertKeepsAnAdmin(
    tx: Prisma.TransactionClient,
    clinicId: string,
  ) {
    const admins = await tx.staffUser.count({
      where: { clinicId, active: true, role: StaffRole.administrador },
    });
    if (admins === 0) {
      throw new ConflictException(
        'Debe quedar al menos un administrador activo.',
      );
    }
  }
}
