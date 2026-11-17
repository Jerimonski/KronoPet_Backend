import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { VaccineStatus } from '@prisma/client';
import { DAY_REGEX, IsNotFutureDay } from '../../common/validators';

// Replica vaccineSchema de KronoPet_Frontend/src/core/schemas/index.ts
export class VaccineDto {
  @IsUUID('all', { message: 'La mascota es obligatoria.' })
  petId!: string;

  @IsOptional()
  @IsUUID()
  catalogId?: string | null;

  @IsString()
  @MinLength(1, { message: 'El nombre de la vacuna es obligatorio.' })
  @MaxLength(120)
  name!: string;

  @IsEnum(VaccineStatus)
  status!: VaccineStatus;

  // Obligatoria y no futura si la vacuna está aplicada
  @ValidateIf((v: VaccineDto) => v.status === VaccineStatus.aplicada)
  @Matches(DAY_REGEX, { message: 'Indica la fecha de aplicación.' })
  @IsNotFutureDay()
  appliedAt!: string | null;

  @Matches(DAY_REGEX, { message: 'La fecha de vencimiento es obligatoria.' })
  expiresAt!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
