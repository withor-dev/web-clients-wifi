import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DataSourceOptions } from 'typeorm';
import { Device } from '../devices/device.entity';
import { Session } from '../sessions/session.entity';
import { Store } from '../stores/store.entity';

/**
 * Carrega o .env quando existir (desenvolvimento local, CLI de migrations e seed).
 * Em produção as variáveis vêm do ambiente da plataforma.
 */
export function loadEnvFile(): void {
  const envPath = join(process.cwd(), '.env');
  if (existsSync(envPath)) process.loadEnvFile(envPath);
}

export function buildDataSourceOptions(): DataSourceOptions {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não definida');

  return {
    type: 'postgres',
    url,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    entities: [Store, Device, Session],
    // __dirname aponta para src/ (ts-node) ou dist/ (produção), então o glob funciona nos dois
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    // O schema é controlado só por migrations, nunca por synchronize
    synchronize: false,
    migrationsRun: false,
  };
}
