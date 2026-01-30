const { createShiftEvent } = require('../../shiftHelpers');

describe('createShiftEvent', () => {
  it('returns null for non confirmed statuses', () => {
    const row = [
      null,
      'Tanaka',
      '2026/02/05',
      new Date(),
      new Date(),
      '希望中',
      null,
      null,
      'S-001',
    ];
    expect(createShiftEvent(row)).toBeNull();
  });

  it('builds a shift object for confirmed rows', () => {
    const startTime = new Date();
    startTime.setHours(9, 0, 0, 0);
    const endTime = new Date();
    endTime.setHours(12, 0, 0, 0);

    const row = [
      new Date(),
      'Tanaka Tsubasa',
      '2026/02/05',
      startTime,
      endTime,
      '確定',
      null,
      null,
      'S-123',
      'memo',
    ];

    const result = createShiftEvent(row);
    expect(result).toBeTruthy();
    expect(result.shiftId).toBe('S-123');
    expect(result.internName).toBe('Tanaka Tsubasa');
    expect(result.formattedStartTime).toBe('09:00');
    expect(result.formattedEndTime).toBe('12:00');
    const start = new Date(result.start);
    const end = new Date(result.end);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(1); // February
    expect(start.getDate()).toBe(5);
    expect(end.getDate()).toBe(5);
  });
});
