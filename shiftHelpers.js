/**
 * Helpers for processing shift rows coming from the spreadsheet.
 */

const SHIFT_STATUS_CONFIRMED = '確定';

function normalizeTimeValue(value) {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string' && value.includes(':')) {
    const [hours, minutes] = value.split(':').map(v => parseInt(v, 10));
    const result = new Date();
    result.setHours(hours, minutes, 0, 0);
    return result;
  }
  return null;
}

function toLocalizedTime(date) {
  if (typeof Utilities !== 'undefined' && Utilities) {
    return Utilities.formatDate(date, 'JST', 'HH:mm');
  }

  return `${date.getHours().toString().padStart(2, '0')}:${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
}

function createShiftEvent(row) {
  if (!row || row.length < 9) {
    return null;
  }

  const internName = row[1];
  const hopeDate = row[2];
  const startTime = row[3];
  const endTime = row[4];
  const status = row[5];
  const shiftId = row[8];
  const workInstructionText = row[9];

  if (status !== SHIFT_STATUS_CONFIRMED || !internName || !hopeDate || !startTime || !endTime) {
    return null;
  }

  const startDate = new Date(hopeDate);
  const normalizedStartTime = normalizeTimeValue(startTime);
  const normalizedEndTime = normalizeTimeValue(endTime);

  if (!normalizedStartTime || !normalizedEndTime) {
    return null;
  }

  startDate.setHours(normalizedStartTime.getHours(), normalizedStartTime.getMinutes(), 0, 0);
  const endDate = new Date(hopeDate);
  endDate.setHours(normalizedEndTime.getHours(), normalizedEndTime.getMinutes(), 0, 0);

  const formattedStartTime = toLocalizedTime(startDate);
  const formattedEndTime = toLocalizedTime(endDate);

  return {
    shiftId,
    internName,
    title: internName,
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    workInstructionText: workInstructionText || '',
    formattedStartTime,
    formattedEndTime,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createShiftEvent };
}
