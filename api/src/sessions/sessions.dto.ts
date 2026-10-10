import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateSessionDto {
  @ApiProperty({ description: 'Loja onde o dispositivo se conectou', format: 'uuid' })
  @IsUUID('all', { message: 'storeId deve ser um UUID válido' })
  storeId: string;

  @ApiProperty({
    description: 'Identificador do dispositivo (ex.: MAC). Só o hash é armazenado.',
    example: 'a4:83:e7:12:9b:3c',
  })
  @IsString()
  @IsNotEmpty({ message: 'deviceIdentifier é obrigatório' })
  @MaxLength(128)
  deviceIdentifier: string;

  @ApiPropertyOptional({
    description: 'Início da conexão (ISO 8601 com fuso). Padrão: agora.',
    example: '2026-10-10T15:30:00Z',
  })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'connectedAt deve ser uma data ISO 8601' })
  connectedAt?: string;

  @ApiPropertyOptional({
    description: 'Fim da conexão (ISO 8601). Omitido = dispositivo ainda conectado.',
    example: '2026-10-10T15:52:00Z',
  })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'disconnectedAt deve ser uma data ISO 8601' })
  disconnectedAt?: string;
}

export class DisconnectSessionDto {
  @ApiPropertyOptional({
    description: 'Momento da desconexão (ISO 8601). Padrão: agora.',
    example: '2026-10-10T15:52:00Z',
  })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'disconnectedAt deve ser uma data ISO 8601' })
  disconnectedAt?: string;
}

export class SessionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  storeId: string;

  @ApiProperty({ format: 'uuid' })
  deviceId: string;

  @ApiProperty({ type: String, format: 'date-time' })
  connectedAt: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  disconnectedAt: string | null;

  @ApiProperty({ description: 'Duração em minutos (nulo se ainda conectado)', type: Number, nullable: true })
  durationMinutes: number | null;
}
