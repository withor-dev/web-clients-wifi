import { hashIdentifier } from './identifier-hash';

describe('hashIdentifier', () => {
  it('gera um hex de 64 caracteres sem expor o identificador', () => {
    const hash = hashIdentifier('AA:BB:CC:DD:EE:FF', 'segredo');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain('aa:bb');
  });

  it('normaliza caixa e espaços', () => {
    expect(hashIdentifier(' AA:BB:CC:DD:EE:FF ', 's')).toBe(hashIdentifier('aa:bb:cc:dd:ee:ff', 's'));
  });

  it('depende do segredo', () => {
    expect(hashIdentifier('aa:bb', 'a')).not.toBe(hashIdentifier('aa:bb', 'b'));
  });
});
