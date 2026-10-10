import { BadRequestException } from '@nestjs/common';

/** Intervalo de datas locais da loja, com `from` e `to` inclusivos (formato YYYY-MM-DD). */
export interface DateRange {
  from: string;
  to: string;
  days: number;
}

export const MAX_RANGE_DAYS = 366;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Converte YYYY-MM-DD em timestamp UTC, ou null se a data não existir no calendário (ex.: 2026-02-30). */
function toUtcTime(value: string): number | null {
  if (!DATE_PATTERN.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const time = Date.UTC(year, month - 1, day);
  const date = new Date(time);
  const sameDate =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return sameDate ? time : null;
}

export function addDays(value: string, amount: number): string {
  const time = toUtcTime(value);
  if (time === null) throw new Error(`Data inválida: ${value}`);
  return new Date(time + amount * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Valida o período pedido pelo front. As datas são "de calendário": a conversão para
 * meia-noite local da loja acontece no SQL, usando o fuso da loja.
 */
export function parseDateRange(from: string, to: string): DateRange {
  const fromTime = toUtcTime(from);
  const toTime = toUtcTime(to);

  const invalid: string[] = [];
  if (fromTime === null) invalid.push('from');
  if (toTime === null) invalid.push('to');
  if (fromTime === null || toTime === null) {
    throw new BadRequestException({
      message: 'Data inválida. Use o formato AAAA-MM-DD com uma data existente.',
      details: { invalidFields: invalid, from, to },
    });
  }

  if (fromTime > toTime) {
    throw new BadRequestException({
      message: 'A data inicial não pode ser posterior à data final.',
      details: { from, to },
    });
  }

  const days = Math.round((toTime - fromTime) / DAY_MS) + 1;
  if (days > MAX_RANGE_DAYS) {
    throw new BadRequestException({
      message: `O período máximo é de ${MAX_RANGE_DAYS} dias.`,
      details: { from, to, days, maxDays: MAX_RANGE_DAYS },
    });
  }

  return { from, to, days };
}

/** Período de mesmo tamanho imediatamente anterior, usado na comparação. */
export function previousRange(range: DateRange): DateRange {
  return {
    from: addDays(range.from, -range.days),
    to: addDays(range.from, -1),
    days: range.days,
  };
}
