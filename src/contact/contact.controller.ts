import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../common/decorators';
import { sendMail } from '../common/mail';
import { ContactDto } from './contact.dto';

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// Formulario de la landing: se guarda siempre y, si hay correo configurado,
// se reenvía a la clínica (un fallo del correo no pierde el mensaje)
@Controller('contact')
export class ContactController {
  private readonly logger = new Logger('ContactController');

  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: ContactDto) {
    const message = await this.prisma.contactMessage.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.trim(),
        clinic: dto.clinic?.trim() || null,
        message: dto.message.trim(),
      },
    });

    const to = process.env.CLINIC_EMAIL;
    if (to && process.env.RESEND_API_KEY) {
      const body = `${message.name} (${message.email})${message.clinic ? ` · ${message.clinic}` : ''}\n\n${message.message}`;
      await sendMail(
        to,
        `Nuevo mensaje de contacto: ${message.name}`,
        `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap">${escapeHtml(body)}</pre>`,
        body,
        message.email,
      ).catch((err: Error) => this.logger.warn(err.message));
    }

    return { id: message.id };
  }
}
