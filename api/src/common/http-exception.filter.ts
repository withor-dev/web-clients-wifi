import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  ValidationError,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';

/** Formato único de erro de toda a API. */
export interface ErrorBody {
  statusCode: number;
  error: string;
  message: string;
  details: unknown;
}

const STATUS_NAMES: Record<number, string> = {
  400: 'Bad Request',
  404: 'Not Found',
  409: 'Conflict',
  500: 'Internal Server Error',
};

function statusName(status: number): string {
  return STATUS_NAMES[status] ?? HttpStatus[status] ?? 'Error';
}

/** Transforma erros do class-validator em um 400 com a lista de campos inválidos. */
export function validationExceptionFactory(errors: ValidationError[]): BadRequestException {
  const flatten = (list: ValidationError[], prefix = ''): { field: string; problems: string[] }[] =>
    list.flatMap((error) => {
      const field = prefix ? `${prefix}.${error.property}` : error.property;
      const own = error.constraints ? [{ field, problems: Object.values(error.constraints) }] : [];
      return [...own, ...flatten(error.children ?? [], field)];
    });

  return new BadRequestException({
    message: 'Dados inválidos na requisição.',
    details: flatten(errors),
  });
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const body = this.toErrorBody(exception);

    if (body.statusCode >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }

    response.status(body.statusCode).json(body);
  }

  private toErrorBody(exception: unknown): ErrorBody {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const data = typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : {};
      const rawMessage = typeof payload === 'string' ? payload : data.message;
      const message = Array.isArray(rawMessage) ? rawMessage.join('; ') : String(rawMessage ?? exception.message);

      return { statusCode: status, error: statusName(status), message, details: data.details ?? null };
    }

    // Erros do Postgres que escapam das validações (ex.: corrida em constraint)
    if (exception instanceof QueryFailedError) {
      const code = (exception.driverError as { code?: string } | undefined)?.code;
      if (code === '22P02' || code === '23514') {
        return {
          statusCode: 400,
          error: statusName(400),
          message: 'Os dados enviados violam uma regra do banco de dados.',
          details: { code },
        };
      }
      if (code === '23503') {
        return {
          statusCode: 404,
          error: statusName(404),
          message: 'Registro relacionado não encontrado.',
          details: { code },
        };
      }
    }

    return {
      statusCode: 500,
      error: statusName(500),
      message: 'Erro interno inesperado. Tente novamente em instantes.',
      details: null,
    };
  }
}
