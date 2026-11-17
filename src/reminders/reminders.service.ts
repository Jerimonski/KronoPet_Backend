import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  AuditEntity,
  ReminderKind,
  ReminderStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Actor } from '../common/decorators';
import { recordAudit } from '../common/audit';
import { toDbDate } from '../common/dates';
import { sendMail } from '../common/mail';
import { toReminderLog, toReminderSettings } from '../common/mappers';
import { ReminderRequestDto, ReminderSettingsDto } from './dto/reminder.dto';
import { buildReminderEmail } from './reminder-email';

@Injectable()
export class RemindersService {
  constructor(private readonly prisma: PrismaService) {}

  async findLogs(clinicId: string) {
    const logs = await this.prisma.reminderLog.findMany({
      where: { tutor: { clinicId } },
      orderBy: { sentAt: 'desc' },
    });
    return logs.map(toReminderLog);
  }

  // Una fila por clínica: se crea con los valores por defecto si falta
  async getSettings(clinicId: string) {
    const settings = await this.prisma.reminderSettings.upsert({
      where: { clinicId },
      update: {},
      create: { clinicId },
    });
    return toReminderSettings(settings);
  }

  async updateSettings(dto: ReminderSettingsDto, clinicId: string) {
    const data = {
      daysBefore: dto.daysBefore,
      autoSend: dto.autoSend,
      lastAutoRun:
        dto.lastAutoRun === undefined
          ? undefined
          : dto.lastAutoRun && toDbDate(dto.lastAutoRun),
    };
    const settings = await this.prisma.reminderSettings.upsert({
      where: { clinicId },
      update: data,
      create: { clinicId, ...data },
    });
    return toReminderSettings(settings);
  }

  /** Arma y envía un correo por aviso; registra el resultado aunque falle. */
  async send(requests: ReminderRequestDto[], actor: Actor) {
    const logs: ReturnType<typeof toReminderLog>[] = [];
    const clinic = await this.prisma.clinic.findUniqueOrThrow({
      where: { id: actor.clinicId },
    });

    for (const { kind, petId, refId, dueDate } of requests) {
      const pet = await this.prisma.pet.findFirst({
        where: { id: petId, tutor: { clinicId: actor.clinicId } },
        include: { tutor: true },
      });
      if (!pet) throw new NotFoundException('La mascota no existe.');
      if (!pet.tutor) {
        throw new BadRequestException(`${pet.name} no tiene tutor asociado.`);
      }

      const itemName =
        kind === ReminderKind.control
          ? ((
              await this.prisma.medicalEvent.findFirst({
                where: { id: refId, petId },
              })
            )?.title ?? 'atención')
          : ((
              await this.prisma.vaccine.findFirst({
                where: { id: refId, petId },
              })
            )?.name ?? 'vacuna');

      const email = buildReminderEmail({
        kind,
        clinicName: clinic.name,
        dueDate,
        tutorName: pet.tutor.name,
        petName: pet.name,
        itemName,
      });

      let status: ReminderStatus = ReminderStatus.enviado;
      let error: string | null = null;
      try {
        await sendMail(pet.tutor.email, email.subject, email.html, email.text);
      } catch (err) {
        status = ReminderStatus.error;
        error = err instanceof Error ? err.message : 'Error desconocido.';
      }

      const log = await this.prisma.$transaction(async (tx) => {
        const created = await tx.reminderLog.create({
          data: {
            key: `${kind}:${refId}:${dueDate}`,
            kind,
            tutorId: pet.tutorId,
            petId,
            refId,
            dueDate: toDbDate(dueDate),
            toEmail: pet.tutor.email,
            sentBy: actor.id,
            status,
            error,
          },
        });
        // Solo los envíos exitosos quedan en la auditoría
        if (status === ReminderStatus.enviado) {
          await recordAudit(tx, {
            actorId: actor.id,
            clinicId: actor.clinicId,
            action: AuditAction.enviar,
            entity: AuditEntity.recordatorio,
            entityId: created.id,
            entityLabel: `${email.subject} → ${pet.tutor.email}`,
          });
        }
        return created;
      });
      logs.push(toReminderLog(log));
    }

    return logs;
  }
}
