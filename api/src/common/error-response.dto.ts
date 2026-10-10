import { ApiProperty } from '@nestjs/swagger';

/** Documentação no Swagger do formato único de erro devolvido pelo HttpExceptionFilter. */
export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'Bad Request' })
  error: string;

  @ApiProperty({ example: 'A data inicial não pode ser posterior à data final.' })
  message: string;

  @ApiProperty({ example: { from: '2026-10-08', to: '2026-10-01' }, nullable: true })
  details: unknown;
}
