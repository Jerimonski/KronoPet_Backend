import { IsString, IsOptional, IsDateString, IsUUID } from 'class-validator';

export class CreateVaccineDto {
  @IsString()
  name!: string;

  @IsString()
  status!: string;

  @IsDateString()
  @IsOptional()
  appliedDate?: string;

  @IsDateString()
  @IsOptional()
  expirationDate?: string;

  @IsUUID()
  petId!: string;
}
