import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DateRange } from '../common/date-range';

export interface PeriodTotals {
  sessions: number;
  uniqueVisitors: number;
  returningVisitors: number;
  medianDwellMinutes: number | null;
}

export interface HeatmapCell {
  dayOfWeek: number;
  hour: number;
  connections: number;
  avgConnections: number;
}

export interface TrafficPoint {
  date: string;
  uniqueVisitors: number;
  sessions: number;
}

/**
 * Converte o período (datas locais da loja) em instantes UTC: [meia-noite de `from`, meia-noite do dia
 * seguinte a `to`). Parâmetros: $1 loja, $2 from, $3 to, $4 fuso IANA.
 * Comparar connected_at com valores constantes mantém o índice (store_id, connected_at) utilizável.
 */
const BOUNDS_CTE = `
  bounds AS (
    SELECT ($2::date)::timestamp AT TIME ZONE $4 AS start_at,
           ($3::date + 1)::timestamp AT TIME ZONE $4 AS end_at
  ),
  period_sessions AS (
    SELECT s.device_id, s.connected_at, s.disconnected_at
    FROM sessions s, bounds b
    WHERE s.store_id = $1
      AND s.connected_at >= b.start_at
      AND s.connected_at < b.end_at
  )`;

/** Consultas de métricas em SQL explícito. Todo agrupamento por hora/dia usa o fuso da loja. */
@Injectable()
export class MetricsRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * - Visitante único: dispositivo distinto com sessão iniciada no período.
   * - Recorrente: visitante do período que já tinha sessão nesta loja antes do início do período.
   * - Permanência: mediana só das sessões encerradas (sessões abertas ainda não têm duração).
   */
  async totals(storeId: string, timezone: string, range: DateRange): Promise<PeriodTotals> {
    const [row] = await this.dataSource.query(
      `
      WITH ${BOUNDS_CTE},
      visitors AS (SELECT DISTINCT device_id FROM period_sessions)
      SELECT
        (SELECT count(*) FROM period_sessions)::int AS sessions,
        (SELECT count(*) FROM visitors)::int AS unique_visitors,
        (
          SELECT count(*)
          FROM visitors v
          WHERE EXISTS (
            SELECT 1 FROM sessions p, bounds b
            WHERE p.device_id = v.device_id AND p.store_id = $1 AND p.connected_at < b.start_at
          )
        )::int AS returning_visitors,
        (
          SELECT percentile_cont(0.5) WITHIN GROUP (
            ORDER BY extract(epoch FROM disconnected_at - connected_at) / 60
          )
          FROM period_sessions
          WHERE disconnected_at IS NOT NULL
        )::float8 AS median_dwell_minutes
      `,
      [storeId, range.from, range.to, timezone],
    );

    return {
      sessions: row.sessions,
      uniqueVisitors: row.unique_visitors,
      returningVisitors: row.returning_visitors,
      medianDwellMinutes: row.median_dwell_minutes,
    };
  }

  /**
   * Conexões iniciadas por dia da semana (ISO: 1 = segunda, 7 = domingo) e hora local.
   * A média divide pelo número de vezes que aquele dia da semana aparece no período,
   * para responder "quantas pessoas chegam numa segunda às 13h, em média".
   */
  async heatmap(storeId: string, timezone: string, range: DateRange): Promise<HeatmapCell[]> {
    const rows: { dow: number; hour: number; connections: number; avg_connections: number }[] =
      await this.dataSource.query(
        `
        WITH ${BOUNDS_CTE},
        weekday_occurrences AS (
          SELECT extract(isodow FROM d)::int AS dow, count(*)::int AS occurrences
          FROM generate_series($2::date, $3::date, interval '1 day') d
          GROUP BY 1
        ),
        cells AS (
          SELECT extract(isodow FROM connected_at AT TIME ZONE $4)::int AS dow,
                 extract(hour FROM connected_at AT TIME ZONE $4)::int AS hour,
                 count(*)::int AS connections
          FROM period_sessions
          GROUP BY 1, 2
        )
        SELECT c.dow, c.hour, c.connections,
               round(c.connections::numeric / w.occurrences, 1)::float8 AS avg_connections
        FROM cells c
        JOIN weekday_occurrences w USING (dow)
        ORDER BY c.dow, c.hour
        `,
        [storeId, range.from, range.to, timezone],
      );

    return rows.map((row) => ({
      dayOfWeek: row.dow,
      hour: row.hour,
      connections: row.connections,
      avgConnections: row.avg_connections,
    }));
  }

  /** Série diária (data local da loja), incluindo dias sem acesso com zero. */
  async traffic(storeId: string, timezone: string, range: DateRange): Promise<TrafficPoint[]> {
    const rows: { date: string; unique_visitors: number; sessions: number }[] =
      await this.dataSource.query(
        `
        WITH ${BOUNDS_CTE},
        daily AS (
          SELECT (connected_at AT TIME ZONE $4)::date AS day,
                 count(DISTINCT device_id)::int AS unique_visitors,
                 count(*)::int AS sessions
          FROM period_sessions
          GROUP BY 1
        )
        SELECT to_char(d, 'YYYY-MM-DD') AS date,
               coalesce(daily.unique_visitors, 0) AS unique_visitors,
               coalesce(daily.sessions, 0) AS sessions
        FROM generate_series($2::date, $3::date, interval '1 day') d
        LEFT JOIN daily ON daily.day = d::date
        ORDER BY d
        `,
        [storeId, range.from, range.to, timezone],
      );

    return rows.map((row) => ({
      date: row.date,
      uniqueVisitors: row.unique_visitors,
      sessions: row.sessions,
    }));
  }
}
