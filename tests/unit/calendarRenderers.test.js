const { buildShiftEventHTML, buildInstructionEventHTML } = require('../../calendarRenderers');

describe('calendar renderers', () => {
  it('buildShiftEventHTML renders label and time', () => {
    const html = buildShiftEventHTML({
      title: 'Tanaka',
      internColor: '#123456',
      formattedStartTime: '09:00',
      formattedEndTime: '12:00',
    });

    expect(html).toContain('Tanaka');
    expect(html).toContain('09:00~12:00');
    expect(html).toContain('#123456');
  });

  it('buildInstructionEventHTML renders category color and time', () => {
    const html = buildInstructionEventHTML({
      title: 'インタビュー',
      category: 'インタビュー',
      formattedStartTime: '10:00',
      formattedEndTime: '11:00',
    });

    expect(html).toContain('インタビュー');
    expect(html).toContain('10:00~11:00');
    expect(html).toContain('#e54b4b');
  });
});
