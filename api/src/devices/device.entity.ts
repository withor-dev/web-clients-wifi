import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Session } from '../sessions/session.entity';

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** HMAC-SHA256 do identificador (ex.: MAC). O valor original nunca é gravado (LGPD). */
  @Column({ name: 'identifier_hash', type: 'char', length: 64, unique: true })
  identifierHash: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => Session, (session) => session.device)
  sessions: Session[];
}
