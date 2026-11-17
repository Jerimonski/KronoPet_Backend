import {
  IsString,
  IsOptional,
  IsDateString,
  IsUUID,
  IsEnum,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { PetSex, ReproductiveStatus, Species } from '@prisma/client';
import { IsNotFutureDay } from '../../common/validators';

export class CreatePetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @IsEnum(Species, {
    message: `La especie debe ser una de las siguientes opciones: ${Object.values(Species).join(', ')}`,
  })
  species!: Species;

  @IsString()
  @IsNotEmpty({ message: 'La raza es obligatoria' })
  @MaxLength(80)
  breed!: string;

  @IsEnum(PetSex, {
    message: `El sexo debe ser uno de los siguientes: ${Object.values(PetSex).join(', ')}`,
  })
  sex!: PetSex;

  @IsDateString()
  @IsNotFutureDay()
  @IsOptional()
  birthDate?: string;

  @IsEnum(ReproductiveStatus, {
    message: `El estado reproductivo debe ser: ${Object.values(ReproductiveStatus).join(', ')}`,
  })
  reproductiveStatus!: ReproductiveStatus;

  @IsUUID()
  tutorId!: string;
}
