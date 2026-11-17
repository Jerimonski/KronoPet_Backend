import {
  IsString,
  IsOptional,
  IsDateString,
  IsUUID,
  IsNumber,
  IsEnum,
  IsNotEmpty,
  Max,
  MaxLength,
  IsPositive,
} from 'class-validator';
import { MedicalReason } from '@prisma/client';
import { IsNotFutureDay } from '../../common/validators';

export class CreateMedicalEventDto {
  @IsDateString()
  @IsNotFutureDay()
  @IsOptional()
  date?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title!: string;

  @IsEnum(MedicalReason, {
    message: `El motivo debe ser una de las siguientes opciones: ${Object.values(MedicalReason).join(', ')}`,
  })
  reason!: MedicalReason;

  @IsString()
  @IsOptional()
  observations?: string;

  @IsString()
  @IsOptional()
  diagnosis?: string;

  @IsString()
  @IsOptional()
  recommendations?: string;

  // Decimal(5,2) con CHECK chk_weight: > 0 y <= 200
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(200, { message: 'El peso no puede superar los 200 kg' })
  weightKg!: number;

  @IsDateString()
  @IsOptional()
  followUpDate?: string;

  @IsUUID()
  vetId!: string;

  @IsUUID()
  petId!: string;

  // Producto del catálogo aplicado en la atención: registra la vacuna en la cartola
  @IsUUID()
  @IsOptional()
  appliedProductId?: string;
}
