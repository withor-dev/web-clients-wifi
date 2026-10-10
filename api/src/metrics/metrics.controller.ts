import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/error-response.dto';
import { uuidParam } from '../common/uuid-param.pipe';
import {
  HeatmapResponseDto,
  MetricsQueryDto,
  SummaryResponseDto,
  TrafficResponseDto,
} from './metrics.dto';
import { MetricsService } from './metrics.service';

const storeIdPipe = uuidParam('storeId');

@ApiTags('metrics')
@ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Datas inválidas, from > to ou período acima de 1 ano' })
@ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Loja inexistente' })
@Controller('stores/:storeId/metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Totais do período e variação vs. período anterior',
    description: 'Visitantes únicos, % recorrentes e permanência mediana, no fuso da loja.',
  })
  @ApiOkResponse({ type: SummaryResponseDto })
  summary(
    @Param('storeId', storeIdPipe) storeId: string,
    @Query() query: MetricsQueryDto,
  ): Promise<SummaryResponseDto> {
    return this.metrics.summary(storeId, query);
  }

  @Get('heatmap')
  @ApiOperation({ summary: 'Conexões por hora × dia da semana (fuso da loja)' })
  @ApiOkResponse({ type: HeatmapResponseDto })
  heatmap(
    @Param('storeId', storeIdPipe) storeId: string,
    @Query() query: MetricsQueryDto,
  ): Promise<HeatmapResponseDto> {
    return this.metrics.heatmap(storeId, query);
  }

  @Get('traffic')
  @ApiOperation({ summary: 'Série diária de visitantes únicos e conexões' })
  @ApiOkResponse({ type: TrafficResponseDto })
  traffic(
    @Param('storeId', storeIdPipe) storeId: string,
    @Query() query: MetricsQueryDto,
  ): Promise<TrafficResponseDto> {
    return this.metrics.traffic(storeId, query);
  }
}
