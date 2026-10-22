import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';

const VALID_STATUS = ['Aplicada', 'Pendiente'];

export class AssignMedicalProductDto {
  @IsUUID()
  petId!: string;

  @IsUUID()
  medicalProductCatalogId!: string;

  @IsIn(VALID_STATUS, {
    message: `El estado debe ser uno de los siguientes: ${VALID_STATUS.join(', ')}`,
  })
  status!: string;

  @IsDateString()
  @IsOptional()
  appliedDate?: string;

  @IsDateString()
  @IsOptional()
  expirationDate?: string;
}
