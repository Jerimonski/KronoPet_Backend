import { Type } from 'class-transformer';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { IsRut, PHONE_REGEX } from '../../common/validators';

// Replica clinicSchema de KronoPet_Frontend/src/core/schemas/index.ts
export class ClinicDataDto {
  @IsString()
  @MinLength(3, { message: 'Ingresa el nombre de la clínica.' })
  @MaxLength(120)
  name!: string;

  @IsRut({ message: 'RUT de la clínica inválido.' })
  rut!: string;

  @IsEmail({}, { message: 'Correo de la clínica inválido.' })
  email!: string;

  @Matches(PHONE_REGEX, {
    message: 'Teléfono de la clínica inválido (ej. +56 2 2345 6789).',
  })
  phone!: string;

  @IsString()
  @MinLength(1, { message: 'La dirección es obligatoria.' })
  @MaxLength(200)
  address!: string;
}

/** Cuenta con la que la clínica entra al panel (rol administrador). */
export class ClinicAdminDto {
  @IsString()
  @MinLength(3, { message: 'Ingresa nombre y apellido del administrador.' })
  @MaxLength(120)
  name!: string;

  @IsRut({ message: 'RUT del administrador inválido.' })
  rut!: string;

  @IsEmail({}, { message: 'Correo del administrador inválido.' })
  email!: string;

  @Matches(PHONE_REGEX, {
    message: 'Teléfono del administrador inválido (ej. +56 9 1234 5678).',
  })
  phone!: string;

  @IsString()
  @MinLength(8, {
    message: 'La contraseña debe tener al menos 8 caracteres.',
  })
  password!: string;
}

export class CreateClinicDto {
  @ValidateNested()
  @Type(() => ClinicDataDto)
  clinic!: ClinicDataDto;

  @ValidateNested()
  @Type(() => ClinicAdminDto)
  admin!: ClinicAdminDto;
}
