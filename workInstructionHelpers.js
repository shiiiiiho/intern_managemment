/**
 * Helpers for processing work instruction rows coming from the spreadsheet.
 */

function normalizeTimeString(value) {
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

function createWorkInstructionEvent(row) {
  if (!row || row.length < 8) {
    return null;
  }

  const targetDate = row[0];
  const startTime = row[1];
  const endTime = row[2];
  const category = row[3];
  const otherDesc = row[4];
  const memo = row[5];
  const creatorName = row[6];
  const workId = row[7];

  if (!targetDate || !category || !startTime || !endTime) {
    return null;
  }

  const normalizedStart = normalizeTimeString(startTime);
  const normalizedEnd = normalizeTimeString(endTime);

  if (!normalizedStart || !normalizedEnd) {
    return null;
  }

  const title = category === 'その他' && otherDesc ? otherDesc : category;
  const startDate = new Date(targetDate);
  startDate.setHours(normalizedStart.getHours(), normalizedStart.getMinutes(), 0, 0);
  const endDate = new Date(targetDate);
  endDate.setHours(normalizedEnd.getHours(), normalizedEnd.getMinutes(), 0, 0);

  return {
    workId,
    title,
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    category,
    otherDescription: otherDesc || '',
    memo: memo || '',
    creatorName: creatorName || '',
    formattedStartTime: toLocalizedTime(startDate),
    formattedEndTime: toLocalizedTime(endDate),
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createWorkInstructionEvent };
}
