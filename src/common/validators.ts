import { registerDecorator, ValidationOptions } from 'class-validator';
import { todayISO } from './dates';
import { isValidRut } from './rut';

export const PHONE_REGEX = /^\+?[\d\s]{8,15}$/;
export const DAY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function IsRut(options?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'isRut',
      target: object.constructor,
      propertyName,
      options: { message: 'RUT inválido.', ...options },
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && isValidRut(value),
      },
    });
}

/** Día YYYY-MM-DD que no sea posterior a hoy (hora de Chile). */
export function IsNotFutureDay(options?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'isNotFutureDay',
      target: object.constructor,
      propertyName,
      options: { message: 'La fecha no puede ser futura.', ...options },
      validator: {
        // El formato lo validan IsDateString/Matches: aquí solo se revisa que no sea futura
        validate: (value: unknown) =>
          typeof value !== 'string' || value <= todayISO(),
      },
    });
}
