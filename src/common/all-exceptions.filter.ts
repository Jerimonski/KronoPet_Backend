import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

const PRISMA_STATUS: Record<string, [number, string]> = {
  P2002: [HttpStatus.CONFLICT, 'Ya existe un registro con esos datos.'],
  P2025: [HttpStatus.NOT_FOUND, 'El registro no existe.'],
  P2003: [HttpStatus.BAD_REQUEST, 'El registro relacionado no es válido.'],
};

// Todas las respuestas de error salen como { statusCode, message } con un
// solo mensaje en español, que el panel muestra tal cual.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('AllExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Ocurrió un error inesperado en el servidor.';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();
      const raw =
        typeof body === 'string'
          ? body
          : (body as { message?: string | string[] }).message;
      message = (Array.isArray(raw) ? raw[0] : raw) ?? exception.message;
    } else if (
      exception instanceof Prisma.PrismaClientKnownRequestError &&
      PRISMA_STATUS[exception.code]
    ) {
      [statusCode, message] = PRISMA_STATUS[exception.code];
    } else {
      this.logger.error(exception);
    }

    res.status(statusCode).json({ statusCode, message });
  }
}
