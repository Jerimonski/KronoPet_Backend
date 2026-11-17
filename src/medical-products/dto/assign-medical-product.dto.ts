import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { VaccineStatus } from '@prisma/client';

export class AssignMedicalProductDto {
  @IsUUID()
  petId!: string;

  @IsUUID()
  catalogId!: string;

  @IsEnum(VaccineStatus, {
    message: `El estado debe ser uno de los siguientes: ${Object.values(VaccineStatus).join(', ')}`,
  })
  status!: VaccineStatus;

  @IsDateString()
  @IsOptional()
  appliedAt?: string;

  // Si no viene, se calcula con appliedAt + daysToReinforce del catálogo
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
