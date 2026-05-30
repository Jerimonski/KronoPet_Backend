import {
  IsString,
  IsOptional,
  IsDateString,
  IsUUID,
  IsNumber,
} from 'class-validator';

export class CreateMedicalEventDto {
  @IsDateString()
  @IsOptional()
  date?: string;

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
}
