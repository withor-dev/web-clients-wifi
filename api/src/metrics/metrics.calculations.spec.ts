import { percentChange, pointsChange, returningRate } from './metrics.calculations';

describe('returningRate', () => {
  it('calcula o percentual com 1 casa decimal', () => {
    expect(returningRate({ uniqueVisitors: 3, returningVisitors: 1 })).toBe(33.3);
  });

  it('retorna null quando não há visitantes', () => {
    expect(returningRate({ uniqueVisitors: 0, returningVisitors: 0 })).toBeNull();
  });
});

describe('percentChange', () => {
  it('calcula crescimento e queda', () => {
    expect(percentChange(120, 100)).toBe(20);
    expect(percentChange(80, 100)).toBe(-20);
  });

  it('retorna null sem base de comparação', () => {
    expect(percentChange(50, 0)).toBeNull();
    expect(percentChange(50, null)).toBeNull();
    expect(percentChange(null, 10)).toBeNull();
  });
});

describe('pointsChange', () => {
  it('retorna a diferença em pontos percentuais', () => {
    expect(pointsChange(32.5, 30)).toBe(2.5);
  });

  it('retorna null se alguma taxa for nula', () => {
    expect(pointsChange(null, 30)).toBeNull();
  });
});
