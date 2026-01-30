const { createUserEntry, normalizeRole, isIntern } = require('../../userMasterHelpers');

describe('user master helpers', () => {
  it('normalizeRole trims values', () => {
    expect(normalizeRole(' 人事担当 ')).toBe('人事担当');
    expect(normalizeRole(null)).toBe('');
  });

  it('createUserEntry builds entry with row number', () => {
    const entry = createUserEntry(['Tanaka', 'インターン生'], 0);
    expect(entry).toEqual({ rowNumber: 2, name: 'Tanaka', role: 'インターン生' });
  });

  it('isIntern returns true for intern role', () => {
    const entry = createUserEntry(['Tanaka', 'インターン生'], 3);
    expect(isIntern(entry)).toBe(true);
  });
});
