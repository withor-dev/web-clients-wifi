import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Session } from '../sessions/session.entity';

@Entity('stores')
export class Store {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  /** Fuso IANA da loja (ex.: America/Sao_Paulo). Todas as métricas são agrupadas nele. */
  @Column({ type: 'varchar', length: 64 })
  timezone: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => Session, (session) => session.store)
  sessions: Session[];
}
