import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { PetAlertType } from '@prisma/client';

export class PetAlertDto {
  @IsEnum(PetAlertType, { message: 'Selecciona el tipo de alerta.' })
  type!: PetAlertType;

  @IsString()
  @MinLength(1, { message: 'La descripción es obligatoria.' })
  @MaxLength(120, { message: 'Máximo 120 caracteres.' })
  description!: string;
}
