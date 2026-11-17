import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { StaffRole } from '@prisma/client';
import { IsRut, PHONE_REGEX } from '../../common/validators';

// Replica staffSchema de KronoPet_Frontend/src/core/schemas/index.ts
export class StaffDto {
  @IsString()
  @MinLength(3, { message: 'Ingresa nombre y apellido.' })
  @MaxLength(120)
  name!: string;

  @IsRut()
  rut!: string;

  @IsEmail({}, { message: 'Correo electrónico inválido.' })
  email!: string;

  @Matches(PHONE_REGEX, {
    message: 'Teléfono inválido (ej. +56 9 1234 5678).',
  })
  phone!: string;

  @IsEnum(StaffRole, { message: 'Selecciona un rol.' })
  role!: StaffRole;

  @IsString()
  @MinLength(1, { message: 'La especialidad es obligatoria.' })
  @MaxLength(120)
  specialty!: string;

  // Obligatoria al crear; al editar, si viene, reemplaza la actual
  @IsOptional()
  @IsString()
  @MinLength(8, {
    message: 'La contraseña debe tener al menos 8 caracteres.',
  })
  password?: string;
}

export class StaffStatusDto {
  @IsBoolean()
  active!: boolean;
}
