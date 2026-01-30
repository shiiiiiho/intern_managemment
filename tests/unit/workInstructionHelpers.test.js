const { createWorkInstructionEvent } = require('../../workInstructionHelpers');

describe('createWorkInstructionEvent', () => {
  it('returns null when required fields are missing', () => {
    const row = [null, null, null, null, null, null, null, null];
    expect(createWorkInstructionEvent(row)).toBeNull();
  });

  it('builds an instruction event for valid rows', () => {
    const startTime = new Date();
    startTime.setHours(10, 0, 0, 0);
    const endTime = new Date();
    endTime.setHours(11, 0, 0, 0);

    const row = ['2026/02/05', startTime, endTime, 'インタビュー', '', 'memo', 'manager', 'WI-1'];

    const result = createWorkInstructionEvent(row);
    expect(result).toBeTruthy();
    expect(result.title).toBe('インタビュー');
    expect(result.workId).toBe('WI-1');
    expect(result.formattedStartTime).toBe('10:00');
    expect(result.formattedEndTime).toBe('11:00');
  });
});
