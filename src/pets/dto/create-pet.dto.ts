import { IsString, IsOptional, IsDateString, IsUUID } from 'class-validator';

export class CreatePetDto {
  @IsString()
  name!: string;

  @IsString()
  species!: string;

  @IsString()
  @IsOptional()
  breed?: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsDateString()
  @IsOptional()
  birthdate?: string;

  @IsString()
  @IsOptional()
  reproductiveStatus?: string;

  @IsUUID()
  ownerId!: string;
}
