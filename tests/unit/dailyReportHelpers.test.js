const { createDailyReport, formatDateYmd } = require('../../dailyReportHelpers');

describe('formatDateYmd', () => {
  it('formats Date into yyyy/MM/dd', () => {
    const date = new Date('2026-02-05T00:00:00.000Z');
    expect(formatDateYmd(date)).toBe('2026/02/05');
  });

  it('returns string with slashes', () => {
    expect(formatDateYmd('2026-02-05')).toBe('2026/02/05');
  });
});

describe('createDailyReport', () => {
  it('returns null if required fields are missing', () => {
    expect(createDailyReport([null, null], 0)).toBeNull();
  });

  it('builds a report object with rowNumber', () => {
    const row = [
      'Tanaka',
      new Date('2026-02-05T00:00:00.000Z'),
      5,
      'work',
      'impression',
      'feedback',
      'manager',
      'DR-1',
    ];

    const result = createDailyReport(row, 3);
    expect(result).toBeTruthy();
    expect(result.rowNumber).toBe(5);
    expect(result.internName).toBe('Tanaka');
    expect(result.attendanceDate).toBe('2026/02/05');
    expect(result.reportId).toBe('DR-1');
  });
});
