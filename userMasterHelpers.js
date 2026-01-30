/**
 * Helpers for processing user master rows.
 */

function normalizeRole(role) {
  if (!role) return '';
  return String(role).trim();
}

function createUserEntry(row, rowIndex) {
  if (!row || row.length < 2) {
    return null;
  }

  const name = row[0];
  const role = row[1];

  if (!name) {
    return null;
  }

  return {
    rowNumber: rowIndex != null ? rowIndex + 2 : undefined,
    name: String(name).trim(),
    role: normalizeRole(role),
  };
}

function isIntern(user) {
  return user && normalizeRole(user.role) === 'インターン生';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createUserEntry, normalizeRole, isIntern };
}
