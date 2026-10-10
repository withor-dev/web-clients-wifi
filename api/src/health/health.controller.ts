import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ErrorResponseDto } from '../common/error-response.dto';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({ summary: 'Informações da API' })
  root() {
    return { name: 'Wi-Fi Dashboard API', docs: '/docs', health: '/health' };
  }

  /** Usado pelo health check do Koyeb e pelo front para detectar o "cold start". */
  @Get('health')
  @ApiOperation({ summary: 'Verifica se a API e o banco estão respondendo' })
  @ApiOkResponse({ schema: { example: { status: 'ok', database: 'ok' } } })
  @ApiServiceUnavailableResponse({ type: ErrorResponseDto })
  async health() {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException({
        message: 'Banco de dados indisponível no momento.',
        details: { database: 'down' },
      });
    }
    return { status: 'ok', database: 'ok' };
  }
}
