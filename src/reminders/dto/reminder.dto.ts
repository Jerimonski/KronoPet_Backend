import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsUUID,
  Matches,
  ValidateNested,
} from 'class-validator';
import { ReminderKind } from '@prisma/client';
import { DAY_REGEX } from '../../common/validators';

export class ReminderRequestDto {
  @IsEnum(ReminderKind)
  kind!: ReminderKind;

  @IsUUID()
  petId!: string;

  // Id de la vacuna o de la ficha que originó el aviso
  @IsUUID()
  refId!: string;

  @Matches(DAY_REGEX)
  dueDate!: string;
}

export class SendRemindersDto {
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ReminderRequestDto)
  reminders!: ReminderRequestDto[];
}

// CHECK chk_days_before: 3, 7, 14 o 30
export class ReminderSettingsDto {
  @IsOptional()
  @IsIn([3, 7, 14, 30], {
    message: 'La anticipación debe ser 3, 7, 14 o 30 días.',
  })
  daysBefore?: number;

  @IsOptional()
  @IsBoolean()
  autoSend?: boolean;

  @IsOptional()
  @Matches(DAY_REGEX)
  lastAutoRun?: string | null;
}
