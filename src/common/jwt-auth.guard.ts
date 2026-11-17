import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { StaffRole } from '@prisma/client';
import {
  AuthRole,
  AuthUser,
  IS_PUBLIC_KEY,
  PLATFORM_ROLE,
  ROLES_KEY,
} from './decorators';

// Guard global: exige un JWT válido salvo en rutas @Public(), revisa @Roles()
// y rechaza al personal deshabilitado aunque su token siga vigente. Cada
// usuario queda con su clínica (`clinicId`), que acota todos los datos.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string>; user?: AuthUser }>();
    const [type, token] = (request.headers.authorization ?? '').split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException(
        'Tu sesión expiró. Vuelve a iniciar sesión.',
      );
    }

    let user: AuthUser;
    try {
      user = await this.jwt.verifyAsync<AuthUser>(token);
    } catch {
      throw new UnauthorizedException(
        'Tu sesión expiró. Vuelve a iniciar sesión.',
      );
    }

    user = await this.current(user);

    const roles = this.reflector.getAllAndOverride<AuthRole[] | undefined>(
      ROLES_KEY,
      targets,
    );
    // La cuenta de plataforma no entra a las rutas de las clínicas
    const allowed = roles ?? [
      'tutor',
      StaffRole.veterinario,
      StaffRole.administrador,
    ];
    if (!allowed.includes(user.role)) {
      throw new ForbiddenException('No tienes permiso para esta acción.');
    }

    request.user = user;
    return true;
  }

  /** Datos vigentes de la cuenta: rol, clínica y si sigue activa. */
  private async current(user: AuthUser): Promise<AuthUser> {
    const expired = new UnauthorizedException(
      'Tu sesión expiró. Vuelve a iniciar sesión.',
    );

    if (user.role === PLATFORM_ROLE) {
      const admin = await this.prisma.platformAdmin.findUnique({
        where: { id: user.sub },
        select: { active: true },
      });
      if (!admin) throw expired;
      if (!admin.active) {
        throw new ForbiddenException('Tu cuenta fue deshabilitada.');
      }
      return user;
    }

    if (user.role === 'tutor') {
      const tutor = await this.prisma.tutor.findUnique({
        where: { id: user.sub },
        select: { clinicId: true },
      });
      if (!tutor) throw expired;
      return { ...user, clinicId: tutor.clinicId };
    }

    const staff = await this.prisma.staffUser.findUnique({
      where: { id: user.sub },
      select: { active: true, role: true, clinicId: true },
    });
    if (!staff) throw expired;
    if (!staff.active) {
      throw new ForbiddenException(
        'Tu cuenta fue deshabilitada. Contacta al administrador de la clínica.',
      );
    }
    // El rol vigente manda sobre el que quedó en el token
    return { ...user, role: staff.role, clinicId: staff.clinicId };
  }
}
