import { BadRequestException } from '@nestjs/common';
import { addDays, MAX_RANGE_DAYS, parseDateRange, previousRange } from './date-range';

describe('parseDateRange', () => {
  it('conta os dias de forma inclusiva', () => {
    expect(parseDateRange('2026-10-01', '2026-10-07')).toEqual({
      from: '2026-10-01',
      to: '2026-10-07',
      days: 7,
    });
  });

  it('aceita período de um único dia', () => {
    expect(parseDateRange('2026-10-10', '2026-10-10').days).toBe(1);
  });

  it.each([
    ['10/01/2026', '2026-10-07'],
    ['2026-02-30', '2026-03-01'],
    ['2026-10-01', 'amanhã'],
  ])('rejeita data inválida (%s, %s)', (from, to) => {
    expect(() => parseDateRange(from, to)).toThrow(BadRequestException);
  });

  it('rejeita from posterior a to', () => {
    expect(() => parseDateRange('2026-10-08', '2026-10-01')).toThrow(/posterior/);
  });

  it('rejeita período maior que o limite', () => {
    const to = addDays('2025-01-01', MAX_RANGE_DAYS);
    expect(() => parseDateRange('2025-01-01', to)).toThrow(/período máximo/);
  });
});

describe('previousRange', () => {
  it('retorna o período de mesmo tamanho imediatamente anterior', () => {
    expect(previousRange(parseDateRange('2026-10-01', '2026-10-07'))).toEqual({
      from: '2026-09-24',
      to: '2026-09-30',
      days: 7,
    });
  });

  it('atravessa virada de ano', () => {
    expect(previousRange(parseDateRange('2026-01-01', '2026-01-30'))).toEqual({
      from: '2025-12-02',
      to: '2025-12-31',
      days: 30,
    });
  });
});
