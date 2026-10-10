import { randomUUID } from 'node:crypto';
import { EntityManager } from 'typeorm';
import { addDays } from '../common/date-range';
import { hashIdentifier } from '../common/identifier-hash';
import dataSource from './data-source';

/**
 * Gera dados simulados com padrões realistas para o painel contar uma história interpretável:
 * picos no almoço e no fim da tarde, sábado mais cheio, ~30% de visitas de quem já veio antes,
 * permanências variadas (com alguns casos longos, que justificam a mediana) e sessões em andamento.
 *
 * ATENÇÃO: apaga todos os dados existentes antes de inserir.
 */

// 270 dias: o filtro de 90 dias compara com os 90 anteriores, e ambos precisam de histórico
// prévio para a recorrência não começar "do zero"
const HISTORY_DAYS = 270;
/** Probabilidade de uma visita ser de um dispositivo que já veio antes. */
const RETURN_PROBABILITY = 0.4;

interface StoreProfile {
  id: string;
  name: string;
  timezone: string;
  baseDailyVisits: number;
  /** Crescimento total ao longo do histórico (0.15 = +15%). */
  growth: number;
  employees: number;
}

// IDs fixos: o front aponta para a loja via VITE_STORE_ID e o valor não muda entre ambientes
export const SEED_STORES: StoreProfile[] = [
  {
    id: '6f1c2a3e-8b4d-4c5e-9f60-1a2b3c4d5e01',
    name: 'O Boticário — Shopping Curitiba',
    timezone: 'America/Sao_Paulo',
    baseDailyVisits: 140,
    growth: 0.3,
    employees: 4,
  },
  {
    id: '6f1c2a3e-8b4d-4c5e-9f60-1a2b3c4d5e02',
    name: 'O Boticário — Manauara Shopping',
    timezone: 'America/Manaus',
    baseDailyVisits: 90,
    growth: -0.1,
    employees: 3,
  },
];

/** Peso por dia da semana ISO (1 = segunda … 7 = domingo). */
const WEEKDAY_WEIGHT: Record<number, number> = { 1: 0.85, 2: 0.8, 3: 0.9, 4: 0.95, 5: 1.15, 6: 1.6, 7: 0.7 };

/** Peso por hora local, com a loja aberta das 10h às 22h. */
const HOUR_WEIGHT: Record<number, number> = {
  10: 0.4, 11: 0.7, 12: 1.6, 13: 1.8, 14: 1.2, 15: 0.8,
  16: 0.9, 17: 1.4, 18: 1.6, 19: 1.3, 20: 0.8, 21: 0.5,
};

/** PRNG determinístico (mulberry32) para o seed gerar sempre a mesma distribuição. */
function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = createRandom(20261010);

function gaussian(): number {
  const u = 1 - random();
  const v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function pickWeighted(weights: Record<number, number>): number {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random() * total;
  for (const [key, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return Number(key);
  }
  return Number(entries[entries.length - 1][0]);
}

/** Permanência típica de ~9 min (log-normal), com ~6% de casos longos (acompanhantes esperando). */
function visitorDwellMinutes(): number {
  if (random() < 0.06) return 90 + Math.round(random() * 210);
  return Math.min(90, Math.max(1, Math.round(Math.exp(Math.log(9) + 0.7 * gaussian()))));
}

function fakeMac(): string {
  return Array.from({ length: 6 }, () =>
    Math.floor(random() * 256)
      .toString(16)
      .padStart(2, '0'),
  ).join(':');
}

function isoWeekday(date: string): number {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

function localToday(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
}

function localTimestamp(date: string, hour: number, minute: number): string {
  return `${date} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
}

interface DeviceRow {
  id: string;
  hash: string;
}

interface SessionRow {
  deviceId: string;
  localConnectedAt: string;
  durationMinutes: number;
}

function generateStoreSessions(store: StoreProfile, devices: DeviceRow[], secret: string): SessionRow[] {
  const sessions: SessionRow[] = [];
  const pool: string[] = [];
  const newDevice = (): string => {
    const device = { id: randomUUID(), hash: hashIdentifier(fakeMac(), secret) };
    devices.push(device);
    return device.id;
  };

  // Funcionários: conectados quase o dia todo, todos os dias. Distorceriam a média de permanência.
  const employeeIds = Array.from({ length: store.employees }, newDevice);

  const today = localToday(store.timezone);
  const firstDay = addDays(today, -(HISTORY_DAYS - 1));

  for (let dayIndex = 0; dayIndex < HISTORY_DAYS; dayIndex++) {
    const date = addDays(firstDay, dayIndex);
    const weekday = isoWeekday(date);

    employeeIds.forEach((employeeId, index) => {
      if ((weekday + index) % 7 === 0) return; // folga semanal
      sessions.push({
        deviceId: employeeId,
        localConnectedAt: localTimestamp(date, 9, 30 + Math.floor(random() * 25)),
        durationMinutes: 480 + Math.round(random() * 60),
      });
    });

    const trend = 1 + store.growth * (dayIndex / HISTORY_DAYS);
    const noise = 1 + gaussian() * 0.08;
    const visits = Math.round(store.baseDailyVisits * WEEKDAY_WEIGHT[weekday] * trend * noise);

    for (let i = 0; i < visits; i++) {
      const returning = pool.length > 0 && random() < RETURN_PROBABILITY;
      const deviceId = returning ? pool[Math.floor(random() * pool.length)] : newDevice();
      if (!returning) pool.push(deviceId);

      sessions.push({
        deviceId,
        localConnectedAt: localTimestamp(date, pickWeighted(HOUR_WEIGHT), Math.floor(random() * 60)),
        durationMinutes: visitorDwellMinutes(),
      });
    }
  }

  return sessions;
}

async function insertSessions(manager: EntityManager, store: StoreProfile, rows: SessionRow[]): Promise<void> {
  const chunkSize = 5000;
  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize);
    // O horário local vira UTC no próprio Postgres, com o fuso da loja.
    // Sessões que começaram no futuro são descartadas; as que ainda não terminaram ficam abertas.
    await manager.query(
      `
      INSERT INTO sessions (store_id, device_id, connected_at, disconnected_at)
      SELECT $1, t.device_id, t.connected_at,
             CASE WHEN t.connected_at + make_interval(mins => t.duration) > now() THEN NULL
                  ELSE t.connected_at + make_interval(mins => t.duration) END
      FROM (
        SELECT d AS device_id, (l::timestamp AT TIME ZONE $2) AS connected_at, m AS duration
        FROM unnest($3::uuid[], $4::text[], $5::int[]) AS u(d, l, m)
      ) t
      WHERE t.connected_at <= now()
      `,
      [
        store.id,
        store.timezone,
        chunk.map((row) => row.deviceId),
        chunk.map((row) => row.localConnectedAt),
        chunk.map((row) => row.durationMinutes),
      ],
    );
  }
}

async function seed(): Promise<void> {
  const secret = process.env.HASH_SECRET;
  if (!secret) throw new Error('HASH_SECRET não definida');

  await dataSource.initialize();
  try {
    await dataSource.transaction(async (manager) => {
      await manager.query('TRUNCATE sessions, devices, stores CASCADE');

      for (const store of SEED_STORES) {
        await manager.query('INSERT INTO stores (id, name, timezone) VALUES ($1, $2, $3)', [
          store.id,
          store.name,
          store.timezone,
        ]);

        const devices: DeviceRow[] = [];
        const sessions = generateStoreSessions(store, devices, secret);

        await manager.query(
          'INSERT INTO devices (id, identifier_hash) SELECT * FROM unnest($1::uuid[], $2::text[])',
          [devices.map((device) => device.id), devices.map((device) => device.hash)],
        );
        await insertSessions(manager, store, sessions);

        console.log(`${store.name}: ${devices.length} dispositivos, ${sessions.length} sessões geradas`);
      }
    });

    const [open] = await dataSource.query(
      'SELECT count(*)::int AS total FROM sessions WHERE disconnected_at IS NULL',
    );
    console.log(`Seed concluído. Sessões em andamento: ${open.total}`);
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((error) => {
  console.error('Falha no seed:', error);
  process.exit(1);
});
