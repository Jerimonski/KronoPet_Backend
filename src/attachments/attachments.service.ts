import {
  BadRequestException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { AttachmentCategory, AuditAction, AuditEntity } from '@prisma/client';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { Actor } from '../common/decorators';
import { recordAudit } from '../common/audit';
import { toAttachment } from '../common/mappers';

/** Archivo recibido por multer (memoryStorage). */
export interface UploadedFileData {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024; // CHECK chk_size

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

@Injectable()
export class AttachmentsService {
  private readonly dir = resolve(process.env.STORAGE_DIR ?? './uploads');

  constructor(private readonly prisma: PrismaService) {}

  async findAll(clinicId: string) {
    const attachments = await this.prisma.attachment.findMany({
      where: { pet: { tutor: { clinicId } } },
      orderBy: { uploadedAt: 'asc' },
    });
    return attachments.map(toAttachment);
  }

  // Solo se agregan: la ficha sigue siendo inmutable
  async upload(
    eventId: string,
    file: UploadedFileData | undefined,
    category: string | undefined,
    actor: Actor,
  ) {
    if (!file) throw new BadRequestException('Selecciona un archivo.');
    if (!Object.values(AttachmentCategory).includes(category as never)) {
      throw new BadRequestException('Selecciona la categoría del archivo.');
    }
    const name = Buffer.from(file.originalname, 'latin1').toString('utf8');
    if (!ACCEPTED_TYPES.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException(
        `«${name}» no es un PDF ni una imagen JPG, PNG o WEBP.`,
      );
    }
    if (file.size > ATTACHMENT_MAX_BYTES) {
      throw new PayloadTooLargeException(
        `«${name}» supera el máximo de 10 MB.`,
      );
    }

    const event = await this.prisma.medicalEvent.findFirst({
      where: { id: eventId, pet: { tutor: { clinicId: actor.clinicId } } },
      include: { pet: { select: { name: true } } },
    });
    if (!event) throw new NotFoundException('La ficha clínica no existe.');

    const storageKey = randomUUID();
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(join(this.dir, storageKey), file.buffer);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const attachment = await tx.attachment.create({
          data: {
            eventId,
            petId: event.petId,
            name: name.slice(0, 255),
            mimeType: file.mimetype,
            size: file.size,
            category: category as AttachmentCategory,
            storageKey,
            uploadedBy: actor.id,
          },
        });
        await recordAudit(tx, {
          actorId: actor.id,
          clinicId: actor.clinicId,
          action: AuditAction.adjuntar,
          entity: AuditEntity.adjunto,
          entityId: attachment.id,
          entityLabel: `${attachment.name} → ${event.title} · ${event.pet.name}`,
        });
        return toAttachment(attachment);
      });
    } catch (error) {
      // Sin fila en la base el archivo quedaría huérfano
      await fs.rm(join(this.dir, storageKey), { force: true });
      throw error;
    }
  }

  async read(id: string, clinicId: string) {
    const attachment = await this.prisma.attachment.findFirst({
      where: { id, pet: { tutor: { clinicId } } },
    });
    if (!attachment) throw new NotFoundException('El archivo no existe.');
    try {
      const buffer = await fs.readFile(join(this.dir, attachment.storageKey));
      return { attachment, buffer };
    } catch {
      throw new NotFoundException('El archivo ya no está disponible.');
    }
  }
}
