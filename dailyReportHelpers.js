/**
 * Helpers for processing daily report rows coming from the spreadsheet.
 */

function formatDateYmd(date) {
  if (!date) return null;
  if (date instanceof Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }
  if (typeof date === 'string') {
    return date.replace(/-/g, '/');
  }
  return null;
}

function createDailyReport(row, rowIndex) {
  if (!row || row.length < 8) {
    return null;
  }

  const internName = row[0];
  const attendanceDate = row[1];
  const satisfaction = row[2];
  const workContent = row[3];
  const impression = row[4];
  const managerFeedback = row[5];
  const feedbackGiverName = row[6];
  const reportId = row[7];

  if (!internName || !attendanceDate) {
    return null;
  }

  return {
    rowNumber: rowIndex != null ? rowIndex + 2 : undefined,
    internName,
    attendanceDate: formatDateYmd(attendanceDate),
    satisfaction,
    workContent,
    impression,
    managerFeedback,
    feedbackGiverName,
    reportId,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createDailyReport, formatDateYmd };
}
