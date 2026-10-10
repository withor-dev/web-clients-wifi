import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildDataSourceOptions } from './database/database.config';
import { HealthController } from './health/health.controller';
import { MetricsController } from './metrics/metrics.controller';
import { MetricsRepository } from './metrics/metrics.repository';
import { MetricsService } from './metrics/metrics.service';
import { SessionsController } from './sessions/sessions.controller';
import { SessionsService } from './sessions/sessions.service';
import { Store } from './stores/store.entity';
import { StoresService } from './stores/stores.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ useFactory: buildDataSourceOptions }),
    TypeOrmModule.forFeature([Store]),
  ],
  controllers: [HealthController, SessionsController, MetricsController],
  providers: [StoresService, SessionsService, MetricsService, MetricsRepository],
})
export class AppModule {}
