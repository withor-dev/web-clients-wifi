import { Body, Controller, HttpCode, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/error-response.dto';
import { uuidParam } from '../common/uuid-param.pipe';
import { CreateSessionDto, DisconnectSessionDto, SessionResponseDto } from './sessions.dto';
import { SessionsService } from './sessions.service';

@ApiTags('sessions')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Post()
  @ApiOperation({
    summary: 'Simula a conexão de um dispositivo ao Wi-Fi de visitantes',
    description: 'Cria o dispositivo (pelo hash do identificador) se ainda não existir e registra a sessão.',
  })
  @ApiCreatedResponse({ type: SessionResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Dados inválidos ou horários incoerentes' })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Loja inexistente' })
  create(@Body() dto: CreateSessionDto): Promise<SessionResponseDto> {
    return this.sessions.create(dto);
  }

  @Patch(':id/disconnect')
  @HttpCode(200)
  @ApiOperation({ summary: 'Encerra uma sessão ainda aberta' })
  @ApiOkResponse({ type: SessionResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Desconexão anterior à conexão' })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Sessão inexistente' })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'Sessão já encerrada' })
  disconnect(
    @Param('id', uuidParam('id')) id: string,
    @Body() dto: DisconnectSessionDto,
  ): Promise<SessionResponseDto> {
    return this.sessions.disconnect(id, dto);
  }
}
