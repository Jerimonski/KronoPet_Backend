import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'El correo electrónico ingresado no es válido' })
  @IsNotEmpty({ message: 'El correo es obligatorio' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'El teléfono es obligatorio para casos de urgencia' })
  phone!: string;

  @IsString()
  @IsNotEmpty({
    message: 'La dirección es obligatoria para el registro clínico',
  })
  address!: string;
}
