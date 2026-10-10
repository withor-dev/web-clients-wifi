import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions, loadEnvFile } from './database.config';

// DataSource usado pela CLI do TypeORM (migrations) e pelo seed
loadEnvFile();

export default new DataSource(buildDataSourceOptions());
