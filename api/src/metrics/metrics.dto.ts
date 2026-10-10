import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

export class MetricsQueryDto {
  @ApiProperty({ description: 'Data inicial (inclusiva), no calendário da loja', example: '2026-09-11' })
  @Matches(DATE_FORMAT, { message: 'from deve estar no formato AAAA-MM-DD' })
  from: string;

  @ApiProperty({ description: 'Data final (inclusiva), no calendário da loja', example: '2026-10-10' })
  @Matches(DATE_FORMAT, { message: 'to deve estar no formato AAAA-MM-DD' })
  to: string;
}

export class StoreDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'O Boticário — Shopping Curitiba' })
  name: string;

  @ApiProperty({ example: 'America/Sao_Paulo' })
  timezone: string;
}

export class PeriodDto {
  @ApiProperty({ example: '2026-09-11' })
  from: string;

  @ApiProperty({ example: '2026-10-10' })
  to: string;

  @ApiProperty({ example: 30 })
  days: number;
}

export class PeriodTotalsDto {
  @ApiProperty({ description: 'Conexões iniciadas no período' })
  sessions: number;

  @ApiProperty({ description: 'Dispositivos distintos no período' })
  uniqueVisitors: number;

  @ApiProperty({ description: 'Visitantes que já tinham visitado a loja antes do período' })
  returningVisitors: number;

  @ApiProperty({ description: 'Visitantes na primeira visita à loja' })
  newVisitors: number;

  @ApiProperty({ description: 'Percentual de recorrentes (0–100)', type: Number, nullable: true })
  returningRate: number | null;

  @ApiProperty({ description: 'Mediana da permanência em minutos (só sessões encerradas)', type: Number, nullable: true })
  medianDwellMinutes: number | null;
}

export class SummaryChangeDto {
  @ApiProperty({ description: 'Variação % de visitantes únicos', type: Number, nullable: true })
  uniqueVisitorsPct: number | null;

  @ApiProperty({ description: 'Diferença em pontos percentuais da taxa de recorrência', type: Number, nullable: true })
  returningRatePoints: number | null;

  @ApiProperty({ description: 'Variação % da permanência mediana', type: Number, nullable: true })
  medianDwellPct: number | null;
}

export class SummaryResponseDto {
  @ApiProperty()
  store: StoreDto;

  @ApiProperty()
  period: PeriodDto;

  @ApiProperty()
  previousPeriod: PeriodDto;

  @ApiProperty()
  current: PeriodTotalsDto;

  @ApiProperty()
  previous: PeriodTotalsDto;

  @ApiProperty({ description: 'Comparação com o período anterior (nulo quando não há base de comparação)' })
  change: SummaryChangeDto;
}

export class HeatmapCellDto {
  @ApiProperty({ description: 'Dia da semana ISO: 1 = segunda … 7 = domingo', minimum: 1, maximum: 7 })
  dayOfWeek: number;

  @ApiProperty({ description: 'Hora local da loja (0–23)', minimum: 0, maximum: 23 })
  hour: number;

  @ApiProperty({ description: 'Total de conexões iniciadas nessa faixa no período' })
  connections: number;

  @ApiProperty({ description: 'Média de conexões por ocorrência desse dia da semana no período' })
  avgConnections: number;
}

export class HeatmapResponseDto {
  @ApiProperty()
  store: StoreDto;

  @ApiProperty()
  period: PeriodDto;

  @ApiProperty({ type: [HeatmapCellDto], description: 'Só as faixas com ao menos uma conexão' })
  cells: HeatmapCellDto[];
}

export class TrafficPointDto {
  @ApiProperty({ example: '2026-10-10' })
  date: string;

  @ApiProperty()
  uniqueVisitors: number;

  @ApiProperty()
  sessions: number;
}

export class TrafficResponseDto {
  @ApiProperty()
  store: StoreDto;

  @ApiProperty()
  period: PeriodDto;

  @ApiProperty({ type: [TrafficPointDto] })
  points: TrafficPointDto[];
}
