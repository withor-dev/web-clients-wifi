import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Device } from '../devices/device.entity';
import { Store } from '../stores/store.entity';

@Entity('sessions')
@Check('ck_sessions_disconnect_after_connect', `"disconnected_at" IS NULL OR "disconnected_at" >= "connected_at"`)
@Index('idx_sessions_store_connected_at', ['storeId', 'connectedAt'])
@Index('idx_sessions_device_store', ['deviceId', 'storeId'])
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'store_id', type: 'uuid' })
  storeId: string;

  @ManyToOne(() => Store, (store) => store.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id', foreignKeyConstraintName: 'fk_sessions_store' })
  store: Store;

  @Column({ name: 'device_id', type: 'uuid' })
  deviceId: string;

  @ManyToOne(() => Device, (device) => device.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'device_id', foreignKeyConstraintName: 'fk_sessions_device' })
  device: Device;

  @Column({ name: 'connected_at', type: 'timestamptz' })
  connectedAt: Date;

  /** Nulo enquanto o dispositivo continua conectado. */
  @Column({ name: 'disconnected_at', type: 'timestamptz', nullable: true })
  disconnectedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
