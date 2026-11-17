import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsRut, PHONE_REGEX } from '../../common/validators';

// Replica tutorSchema de KronoPet_Frontend/src/core/schemas/index.ts
export class TutorDto {
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

  @IsString()
  @MinLength(1, { message: 'La dirección es obligatoria.' })
  @MaxLength(200)
  address!: string;

  // Contraseña inicial para la app móvil del tutor (se guarda con hash)
  @IsOptional()
  @IsString()
  @MinLength(8, {
    message: 'La contraseña debe tener al menos 8 caracteres.',
  })
  password?: string;
}
