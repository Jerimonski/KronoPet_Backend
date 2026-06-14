import {
  IsString,
  IsOptional,
  IsDateString,
  IsUUID,
  IsIn,
} from 'class-validator';

const VALID_SPECIES = ['Perro', 'Gato'];
const VALID_GENDERS = ['Macho', 'Hembra'];
const VALID_STATUS = ['Intacto', 'Esterilizado'];

export class CreatePetDto {
  @IsString()
  name!: string;

  @IsString()
  @IsIn(VALID_SPECIES, {
    message: `La especie debe ser una de las siguientes opciones: ${VALID_SPECIES.join(', ')}`,
  })
  species!: string;

  @IsString()
  @IsOptional()
  breed?: string;

  @IsString()
  @IsIn(VALID_GENDERS, {
    message: `El género debe ser uno de los siguientes: ${VALID_GENDERS.join(', ')}`,
  })
  gender!: string;

  @IsDateString()
  birthdate!: string;

  @IsString()
  @IsOptional()
  @IsIn(VALID_STATUS, {
    message: `El estado reproductivo debe ser: ${VALID_STATUS.join(', ')}`,
  })
  reproductiveStatus?: string;

  @IsUUID()
  ownerId!: string;
}
