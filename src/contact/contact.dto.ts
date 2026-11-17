import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ContactDto {
  @IsString()
  @MinLength(2, { message: 'Ingresa tu nombre.' })
  @MaxLength(120)
  name!: string;

  @IsEmail({}, { message: 'Correo electrónico inválido.' })
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  clinic?: string;

  @IsString()
  @MinLength(5, { message: 'Escribe tu mensaje.' })
  @MaxLength(5000)
  message!: string;
}
