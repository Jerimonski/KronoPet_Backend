import { IsString, IsBoolean, IsInt, IsIn, IsPositive } from 'class-validator';

const VALID_SPECIES = ['Perro', 'Gato'];

export class CreateMedicalProductDto {
  @IsString()
  name!: string;

  @IsString()
  @IsIn(VALID_SPECIES, {
    message: `La especie objetivo debe ser una de las siguientes opciones: ${VALID_SPECIES.join(', ')}`,
  })
  targetSpecies!: string;

  @IsBoolean()
  isBase!: boolean;

  @IsBoolean()
  requiresReinforcement!: boolean;

  @IsInt()
  @IsPositive({
    message: 'Los días para reaplicación deben ser un número entero positivo',
  })
  daysToReinforce!: number;
}
