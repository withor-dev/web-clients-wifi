import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, IsNull } from 'typeorm';
import { hashIdentifier } from '../common/identifier-hash';
import { Device } from '../devices/device.entity';
import { StoresService } from '../stores/stores.service';
import { CreateSessionDto, DisconnectSessionDto, SessionResponseDto } from './sessions.dto';
import { Session } from './session.entity';

/** Tolerância para relógios de equipamentos levemente adiantados. */
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

@Injectable()
export class SessionsService {
  private readonly hashSecret: string;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly stores: StoresService,
    config: ConfigService,
  ) {
    this.hashSecret = config.getOrThrow<string>('HASH_SECRET');
  }

  async create(dto: CreateSessionDto): Promise<SessionResponseDto> {
    await this.stores.findOrFail(dto.storeId);

    const now = new Date();
    const connectedAt = dto.connectedAt ? new Date(dto.connectedAt) : now;
    const disconnectedAt = dto.disconnectedAt ? new Date(dto.disconnectedAt) : null;

    this.assertNotInFuture('connectedAt', connectedAt, now);
    if (disconnectedAt) {
      this.assertNotInFuture('disconnectedAt', disconnectedAt, now);
      this.assertDisconnectAfterConnect(connectedAt, disconnectedAt);
    }

    const identifierHash = hashIdentifier(dto.deviceIdentifier, this.hashSecret);

    const session = await this.dataSource.transaction(async (manager) => {
      // Upsert atômico: dois cadastros simultâneos do mesmo aparelho não geram dispositivos duplicados
      await manager
        .createQueryBuilder()
        .insert()
        .into(Device)
        .values({ identifierHash })
        .orIgnore()
        .execute();
      const device = await manager.findOneByOrFail(Device, { identifierHash });

      return manager.save(
        manager.create(Session, {
          storeId: dto.storeId,
          deviceId: device.id,
          connectedAt,
          disconnectedAt,
        }),
      );
    });

    return toResponse(session);
  }

  async disconnect(id: string, dto: DisconnectSessionDto): Promise<SessionResponseDto> {
    const repository = this.dataSource.getRepository(Session);
    const session = await repository.findOneBy({ id });
    if (!session) {
      throw new NotFoundException({ message: 'Sessão não encontrada.', details: { sessionId: id } });
    }
    if (session.disconnectedAt) {
      throw this.alreadyClosed(session);
    }

    const now = new Date();
    const disconnectedAt = dto.disconnectedAt ? new Date(dto.disconnectedAt) : now;
    this.assertNotInFuture('disconnectedAt', disconnectedAt, now);
    this.assertDisconnectAfterConnect(session.connectedAt, disconnectedAt);

    // A condição "ainda aberta" no UPDATE evita que duas desconexões simultâneas passem
    const result = await repository.update({ id, disconnectedAt: IsNull() }, { disconnectedAt });
    if (!result.affected) {
      throw this.alreadyClosed(await repository.findOneByOrFail({ id }));
    }

    return toResponse({ ...session, disconnectedAt });
  }

  private alreadyClosed(session: Session): ConflictException {
    return new ConflictException({
      message: 'Esta sessão já foi encerrada.',
      details: { sessionId: session.id, disconnectedAt: session.disconnectedAt?.toISOString() ?? null },
    });
  }

  private assertNotInFuture(field: string, value: Date, now: Date): void {
    if (value.getTime() > now.getTime() + FUTURE_TOLERANCE_MS) {
      throw new BadRequestException({
        message: `${field} não pode estar no futuro.`,
        details: { field, value: value.toISOString(), now: now.toISOString() },
      });
    }
  }

  private assertDisconnectAfterConnect(connectedAt: Date, disconnectedAt: Date): void {
    if (disconnectedAt.getTime() < connectedAt.getTime()) {
      throw new BadRequestException({
        message: 'A desconexão não pode ser anterior à conexão.',
        details: {
          connectedAt: connectedAt.toISOString(),
          disconnectedAt: disconnectedAt.toISOString(),
        },
      });
    }
  }
}

function toResponse(session: Session): SessionResponseDto {
  const durationMinutes = session.disconnectedAt
    ? Math.round((session.disconnectedAt.getTime() - session.connectedAt.getTime()) / 60000)
    : null;

  return {
    id: session.id,
    storeId: session.storeId,
    deviceId: session.deviceId,
    connectedAt: session.connectedAt.toISOString(),
    disconnectedAt: session.disconnectedAt?.toISOString() ?? null,
    durationMinutes,
  };
}
