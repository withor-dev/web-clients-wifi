import { createHmac } from 'node:crypto';

/**
 * Gera o hash do identificador do dispositivo (ex.: MAC) com HMAC-SHA256.
 * O segredo impede reverter o hash por força bruta, já que o espaço de MACs é pequeno.
 * O identificador é normalizado para que "AA:BB" e " aa:bb " virem o mesmo dispositivo.
 */
export function hashIdentifier(identifier: string, secret: string): string {
  const normalized = identifier.trim().toLowerCase();
  return createHmac('sha256', secret).update(normalized).digest('hex');
}
