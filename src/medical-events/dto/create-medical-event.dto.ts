import {
  IsString,
  IsOptional,
  IsDateString,
  IsUUID,
  IsNumber,
  IsIn,
} from 'class-validator';

const VALID_CATEGORIES = [
  'Inmunizacion',
  'Consulta',
  'Cirugia',
  'Desparasitacion',
];

export class CreateMedicalEventDto {
  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsIn(VALID_CATEGORIES, {
    message: `La categoría debe ser una de las siguientes opciones: ${VALID_CATEGORIES.join(', ')}`,
  })
  category!: string;

  @IsString()
  title!: string;

  @IsString()
  reason!: string;

  @IsString()
  observations!: string;

  @IsString()
  diagnosis!: string;

  @IsString()
  recommendations!: string;

  @IsNumber()
  @IsOptional()
  weight?: number;

  @IsString()
  veterinarian!: string;

  @IsUUID()
  petId!: string;

  @IsUUID()
  @IsOptional()
  appliedProductId?: string;
}
