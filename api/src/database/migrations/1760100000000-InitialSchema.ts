import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1760100000000 implements MigrationInterface {
  name = 'InitialSchema1760100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE "stores" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(120) NOT NULL,
        "timezone" varchar(64) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_stores" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "devices" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "identifier_hash" char(64) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_devices" PRIMARY KEY ("id"),
        CONSTRAINT "uq_devices_identifier_hash" UNIQUE ("identifier_hash")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "sessions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "store_id" uuid NOT NULL,
        "device_id" uuid NOT NULL,
        "connected_at" timestamptz NOT NULL,
        "disconnected_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "fk_sessions_store" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_sessions_device" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE,
        CONSTRAINT "ck_sessions_disconnect_after_connect"
          CHECK ("disconnected_at" IS NULL OR "disconnected_at" >= "connected_at")
      )
    `);

    // Todas as consultas de métricas filtram por loja + intervalo de connected_at
    await queryRunner.query(
      `CREATE INDEX "idx_sessions_store_connected_at" ON "sessions" ("store_id", "connected_at")`,
    );
    // Usado para descobrir se o dispositivo já visitou a loja antes do período (recorrência)
    await queryRunner.query(
      `CREATE INDEX "idx_sessions_device_store" ON "sessions" ("device_id", "store_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "sessions"`);
    await queryRunner.query(`DROP TABLE "devices"`);
    await queryRunner.query(`DROP TABLE "stores"`);
  }
}
