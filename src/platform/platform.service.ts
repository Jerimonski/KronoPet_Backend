import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  AuditEntity,
  Clinic,
  StaffRole,
  StaffUser,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { recordAudit } from '../common/audit';
import { cleanRut, formatRut } from '../common/rut';
import { ClinicDataDto, CreateClinicDto } from './dto/clinic.dto';

type ClinicRow = Clinic & {
  staff: Pick<StaffUser, 'name' | 'email' | 'role' | 'active' | 'createdAt'>[];
  _count: { tutors: number };
};

function toClinic(c: ClinicRow) {
  // La cuenta de la clínica es su primer administrador
  const admin = c.staff.find((s) => s.role === StaffRole.administrador);
  return {
    id: c.id,
    name: c.name,
    rut: c.rut,
    email: c.email,
    phone: c.phone ?? '',
    address: c.address ?? '',
    createdAt: c.createdAt.toISOString(),
    admin: admin ? { name: admin.name, email: admin.email } : null,
    staffCount: c.staff.filter((s) => s.active).length,
    tutorCount: c._count.tutors,
  };
}

const CLINIC_INCLUDE = {
  staff: {
    select: {
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  },
  _count: { select: { tutors: true } },
} as const;

// Panel de la plataforma: da de alta, edita y elimina clínicas; no ve sus datos clínicos
@Injectable()
export class PlatformService {
  private readonly logger = new Logger(PlatformService.name);
  // Misma carpeta que usa AttachmentsService
  private readonly storageDir = resolve(process.env.STORAGE_DIR ?? './uploads');

  constructor(private readonly prisma: PrismaService) {}

  async findClinics() {
    const clinics = await this.prisma.clinic.findMany({
      include: CLINIC_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return clinics.map(toClinic);
  }

  /** Crea la clínica con su cuenta de administrador, en una sola transacción. */
  async createClinic(dto: CreateClinicDto, platformAdminId: string) {
    await this.assertUnique(dto);
    const passwordHash = await bcrypt.hash(dto.admin.password, 10);

    return this.prisma.$transaction(async (tx) => {
      const clinic = await tx.clinic.create({
        data: {
          name: dto.clinic.name.trim(),
          rut: formatRut(dto.clinic.rut),
          email: dto.clinic.email.trim(),
          phone: dto.clinic.phone.trim(),
          address: dto.clinic.address.trim(),
          createdBy: platformAdminId,
        },
      });
      const admin = await tx.staffUser.create({
        data: {
          clinicId: clinic.id,
          name: dto.admin.name.trim(),
          rut: formatRut(dto.admin.rut),
          email: dto.admin.email.trim(),
          phone: dto.admin.phone.trim(),
          role: StaffRole.administrador,
          specialty: 'Administración',
          passwordHash,
        },
      });
      await tx.reminderSettings.create({ data: { clinicId: clinic.id } });
      // Sin actor: la cuenta la creó la plataforma, no alguien de la clínica
      await recordAudit(tx, {
        clinicId: clinic.id,
        actorId: null,
        action: AuditAction.crear,
        entity: AuditEntity.equipo,
        entityId: admin.id,
        entityLabel: admin.name,
      });
      return toClinic({
        ...clinic,
        staff: [admin],
        _count: { tutors: 0 },
      });
    });
  }

  /** Edita los datos de la clínica (no su cuenta de ingreso). */
  async updateClinic(id: string, dto: ClinicDataDto) {
    await this.findOrFail(id);
    await this.assertClinicRutFree(dto.rut, id);
    const clinic = await this.prisma.clinic.update({
      where: { id },
      data: {
        name: dto.name.trim(),
        rut: formatRut(dto.rut),
        email: dto.email.trim(),
        phone: dto.phone.trim(),
        address: dto.address.trim(),
      },
      include: CLINIC_INCLUDE,
    });
    return toClinic(clinic);
  }

  /**
   * Elimina la clínica con todos sus datos (personal, tutores, mascotas,
   * fichas, vacunas, adjuntos, recordatorios y auditoría). No se puede deshacer.
   */
  async removeClinic(id: string) {
    await this.findOrFail(id);
    const ofClinic = { tutor: { clinicId: id } };
    const files = await this.prisma.attachment.findMany({
      where: { pet: ofClinic },
      select: { storageKey: true },
    });

    // En orden inverso a las FK con Restrict
    await this.prisma.$transaction([
      this.prisma.auditEntry.deleteMany({ where: { clinicId: id } }),
      this.prisma.reminderLog.deleteMany({ where: ofClinic }),
      this.prisma.attachment.deleteMany({ where: { pet: ofClinic } }),
      this.prisma.vaccine.deleteMany({ where: { pet: ofClinic } }),
      this.prisma.medicalEvent.deleteMany({ where: { pet: ofClinic } }),
      this.prisma.petAlert.deleteMany({ where: { pet: ofClinic } }),
      this.prisma.pet.deleteMany({ where: ofClinic }),
      this.prisma.tutor.deleteMany({ where: { clinicId: id } }),
      this.prisma.staffUser.deleteMany({ where: { clinicId: id } }),
      this.prisma.clinic.delete({ where: { id } }), // reminder_settings en cascada
    ]);

    // Los archivos se borran después del commit: si falla, solo quedan huérfanos
    await Promise.all(
      files.map(({ storageKey }) =>
        fs
          .rm(join(this.storageDir, storageKey), { force: true })
          .catch((err: unknown) =>
            this.logger.warn(
              `No se pudo borrar el adjunto ${storageKey}: ${String(err)}`,
            ),
          ),
      ),
    );
  }

  private async findOrFail(id: string) {
    const clinic = await this.prisma.clinic.findUnique({ where: { id } });
    if (!clinic) throw new NotFoundException('Clínica no encontrada.');
    return clinic;
  }

  private async assertClinicRutFree(rut: string, exceptId?: string) {
    const clinics = await this.prisma.clinic.findMany({
      select: { id: true, rut: true },
    });
    if (
      clinics.some(
        (c) => c.id !== exceptId && cleanRut(c.rut) === cleanRut(rut),
      )
    ) {
      throw new ConflictException('Ya existe una clínica con ese RUT.');
    }
  }

  private async assertUnique(dto: CreateClinicDto) {
    await this.assertClinicRutFree(dto.clinic.rut);
    // Correo y RUT del personal son únicos en toda la plataforma
    const staff = await this.prisma.staffUser.findMany({
      select: { email: true, rut: true },
    });
    if (
      staff.some(
        (s) => s.email.toLowerCase() === dto.admin.email.trim().toLowerCase(),
      )
    ) {
      throw new ConflictException(
        'Ya existe una cuenta del personal con ese correo electrónico.',
      );
    }
    if (staff.some((s) => cleanRut(s.rut) === cleanRut(dto.admin.rut))) {
      throw new ConflictException(
        'Ya existe una cuenta del personal con ese RUT.',
      );
    }
  }
}
