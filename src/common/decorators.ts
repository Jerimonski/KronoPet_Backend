import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { StaffRole } from '@prisma/client';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';

/** Cuenta de la plataforma KronoPet (tabla platform_admins): solo da de alta clínicas. */
export const PLATFORM_ROLE = 'plataforma';

export type AuthRole = StaffRole | 'tutor' | typeof PLATFORM_ROLE;

/**
 * Usuario autenticado que el guard deja en `request.user` (payload del JWT).
 * `clinicId` lo pone el guard desde la base para el personal y los tutores.
 */
export interface AuthUser {
  sub: string;
  email: string;
  role: AuthRole;
  clinicId?: string;
}

/** Quien hace un cambio en una clínica: firma la auditoría y acota los datos. */
export interface Actor {
  id: string;
  clinicId: string;
}

export const actorOf = (user: AuthUser): Actor => ({
  id: user.sub,
  clinicId: user.clinicId!,
});

/** Ruta sin token (login, health, contacto). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Roles permitidos. Sin este decorador basta con cualquier token de clínica
 * (personal o tutor); la cuenta de plataforma solo entra con @PlatformOnly().
 */
export const Roles = (...roles: AuthRole[]) => SetMetadata(ROLES_KEY, roles);

/** Rutas del panel: solo el personal de la clínica. */
export const StaffOnly = () =>
  Roles(StaffRole.veterinario, StaffRole.administrador);

/** Rutas del panel de la plataforma. */
export const PlatformOnly = () => Roles(PLATFORM_ROLE);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<{ user: AuthUser }>().user,
);
