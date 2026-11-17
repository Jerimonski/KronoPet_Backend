import {
  IsString,
  IsBoolean,
  IsInt,
  IsEnum,
  IsPositive,
  ValidateIf,
} from 'class-validator';
import { Species } from '@prisma/client';

export class CreateMedicalProductDto {
  @IsString()
  name!: string;

  @IsEnum(Species, {
    message: `La especie objetivo debe ser una de las siguientes opciones: ${Object.values(Species).join(', ')}`,
  })
  targetSpecies!: Species;

  @IsBoolean()
  isBase!: boolean;

  @IsBoolean()
  requiresReinforcement!: boolean;

  // Solo es obligatorio si el producto requiere refuerzo
  @ValidateIf((dto: CreateMedicalProductDto) => dto.requiresReinforcement)
  @IsInt()
  @IsPositive({
    message: 'Los días para reaplicación deben ser un número entero positivo',
  })
  daysToReinforce?: number;
}
