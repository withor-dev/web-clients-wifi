import { Injectable } from '@nestjs/common';
import { parseDateRange, previousRange } from '../common/date-range';
import { Store } from '../stores/store.entity';
import { StoresService } from '../stores/stores.service';
import { percentChange, pointsChange, returningRate, round1 } from './metrics.calculations';
import {
  HeatmapResponseDto,
  MetricsQueryDto,
  PeriodTotalsDto,
  StoreDto,
  SummaryResponseDto,
  TrafficResponseDto,
} from './metrics.dto';
import { MetricsRepository, PeriodTotals } from './metrics.repository';

@Injectable()
export class MetricsService {
  constructor(
    private readonly stores: StoresService,
    private readonly metrics: MetricsRepository,
  ) {}

  async summary(storeId: string, query: MetricsQueryDto): Promise<SummaryResponseDto> {
    const range = parseDateRange(query.from, query.to);
    const store = await this.stores.findOrFail(storeId);
    const previous = previousRange(range);

    const [currentTotals, previousTotals] = await Promise.all([
      this.metrics.totals(store.id, store.timezone, range),
      this.metrics.totals(store.id, store.timezone, previous),
    ]);
    const current = toTotalsDto(currentTotals);
    const before = toTotalsDto(previousTotals);

    return {
      store: toStoreDto(store),
      period: range,
      previousPeriod: previous,
      current,
      previous: before,
      change: {
        uniqueVisitorsPct: percentChange(current.uniqueVisitors, before.uniqueVisitors),
        returningRatePoints: pointsChange(current.returningRate, before.returningRate),
        medianDwellPct: percentChange(current.medianDwellMinutes, before.medianDwellMinutes),
      },
    };
  }

  async heatmap(storeId: string, query: MetricsQueryDto): Promise<HeatmapResponseDto> {
    const range = parseDateRange(query.from, query.to);
    const store = await this.stores.findOrFail(storeId);
    const cells = await this.metrics.heatmap(store.id, store.timezone, range);
    return { store: toStoreDto(store), period: range, cells };
  }

  async traffic(storeId: string, query: MetricsQueryDto): Promise<TrafficResponseDto> {
    const range = parseDateRange(query.from, query.to);
    const store = await this.stores.findOrFail(storeId);
    const points = await this.metrics.traffic(store.id, store.timezone, range);
    return { store: toStoreDto(store), period: range, points };
  }
}

function toStoreDto(store: Store): StoreDto {
  return { id: store.id, name: store.name, timezone: store.timezone };
}

function toTotalsDto(totals: PeriodTotals): PeriodTotalsDto {
  return {
    sessions: totals.sessions,
    uniqueVisitors: totals.uniqueVisitors,
    returningVisitors: totals.returningVisitors,
    newVisitors: totals.uniqueVisitors - totals.returningVisitors,
    returningRate: returningRate(totals),
    medianDwellMinutes: totals.medianDwellMinutes === null ? null : round1(totals.medianDwellMinutes),
  };
}
