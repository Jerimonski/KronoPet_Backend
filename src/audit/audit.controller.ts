import { Controller, Get } from '@nestjs/common';
import { StaffRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { toAuditEntry } from '../common/mappers';

// Solo lectura: las entradas las escribe cada servicio en su transacción
@Roles(StaffRole.administrador)
@Controller('audit')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(@CurrentUser() user: AuthUser) {
    const entries = await this.prisma.auditEntry.findMany({
      where: { clinicId: user.clinicId },
      orderBy: { at: 'desc' },
    });
    return entries.map(toAuditEntry);
  }
}
