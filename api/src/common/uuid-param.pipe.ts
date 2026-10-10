import { BadRequestException, ParseUUIDPipe } from '@nestjs/common';

/** ParseUUIDPipe com mensagem no formato único de erro da API. */
export function uuidParam(field: string): ParseUUIDPipe {
  return new ParseUUIDPipe({
    exceptionFactory: () =>
      new BadRequestException({ message: `${field} deve ser um UUID válido.`, details: { field } }),
  });
}
