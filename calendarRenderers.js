/**
 * Client-side calendar rendering helpers.
 */

function buildShiftEventHTML({ title, internColor, formattedStartTime, formattedEndTime }) {
  const timeText =
    formattedStartTime && formattedEndTime ? `${formattedStartTime}~${formattedEndTime}` : '';
  return `
    <div class="fc-event-shift">
      <span class="fc-event-dot" style="background-color:${internColor || '#ccc'};"></span>
      <span class="fc-event-label">${title}</span>
      ${timeText ? `<span class="fc-event-time">${timeText}</span>` : ''}
    </div>
  `;
}

function buildInstructionEventHTML({ title, formattedStartTime, formattedEndTime, category }) {
  const timeText =
    formattedStartTime && formattedEndTime ? `${formattedStartTime}~${formattedEndTime}` : '';
  const colorMap = {
    インタビュー: '#e54b4b',
    採用イベント: '#4a90e2',
    Dooox: '#111',
    その他: '#6c63ff',
  };
  const color = colorMap[category] || '#666';

  return `
    <div class="fc-event-anchor" style="color:white; background-color:${color};">
      <span class="fc-event-label">${title}</span>
      ${timeText ? `<span class="fc-event-time">${timeText}</span>` : ''}
    </div>
  `;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildShiftEventHTML, buildInstructionEventHTML };
}
