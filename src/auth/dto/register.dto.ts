import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  // Clínica a la que se registra el tutor (cada clínica tiene sus propios tutores)
  @IsUUID('4', { message: 'La clínica no es válida' })
  clinicId!: string;

  @IsEmail({}, { message: 'El correo electrónico ingresado no es válido' })
  @IsNotEmpty({ message: 'El correo es obligatorio' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(120)
  name!: string;

  @Matches(/^\d{7,8}-[\dkK]$/, {
    message: 'El RUT debe tener el formato 12345678-9',
  })
  rut!: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  address?: string;
}
