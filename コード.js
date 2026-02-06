/**
 * Webアプリにアクセスがあった時（GETリクエスト）に実行される関数
 */
function doGet(e) {
  const template = HtmlService.createTemplateFromFile('index');
  return template
    .evaluate()
    .setTitle('インターン管理アプリ')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ----------------------------------------
// グローバル定数
// ----------------------------------------
const SPREADSHEET_ID = '1cYl3uP0XHFo5Z_SgpJ7EbzJ2F7UKNthyW56oGvgw4TM';
const SHEET_USER = 'ユーザーマスタ';
const SHEET_SHIFT = 'シフト';
const SHEET_WORK_INSTRUCTION = '業務指示';
const SHEET_DAILY_REPORT = '日報';
const SHEET_SETTINGS = '設定';
const REMINDER_DEADLINE_CELL = 'B2';

const COLOR_PALETTE = [
  '#FF6347',
  '#4682B4',
  '#32CD32',
  '#FFD700',
  '#8A2BE2',
  '#FF69B4',
  '#00CED1',
  '#FF8C00',
];
let internColors = {}; // To store internName -> color mapping
let colorIndex = 0; // To cycle through COLOR_PALETTE

function getUserRecords(userSheet) {
  try {
    const sheet = userSheet;
    if (!sheet || sheet.getLastRow() < 2) {
      return [];
    }
    const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues(); // A-C
    return values
      .map(row => ({
        name: row[0],
        role: row[1] ? String(row[1]).trim() : '',
        email: row[2] ? String(row[2]).trim() : '',
      }))
      .filter(row => row.name);
  } catch (e) {
    Logger.log('getUserRecords Error: ' + e.message);
    return [];
  }
}

function normalizeEmails(emailField) {
  if (!emailField) return [];
  return String(emailField)
    .split(/[,\s;]+/)
    .map(e => e.trim())
    .filter(e => e);
}

function getEmailsByRoles(roles, userSheet) {
  const records = getUserRecords(userSheet);
  const roleSet = new Set(roles);
  const emails = records
    .filter(r => roleSet.has(r.role) && r.email)
    .flatMap(r => normalizeEmails(r.email));
  return [...new Set(emails)];
}

function getEmailByName(name, userSheet) {
  const records = getUserRecords(userSheet);
  const record = records.find(r => r.name === name);
  return record && record.email ? normalizeEmails(record.email) : [];
}

function sendMailSafe({ to, bcc, subject, body }) {
  try {
    Logger.log(
      'sendMailSafe: to=' + (to || '') + ' bcc=' + (bcc || '') + ' subject=' + (subject || '')
    );
    const mailOptions = {};
    if (bcc) mailOptions.bcc = bcc;
    MailApp.sendEmail(to || '', subject || '', body || '', mailOptions);
  } catch (e) {
    Logger.log('sendMailSafe Error: ' + e.message);
  }
}

function getAllWorkInstructionsInternal(workInstructionSheet) {
  try {
    const sheet = workInstructionSheet;
    if (!sheet || sheet.getLastRow() < 2) {
      return [];
    }
    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9); // A-I
    const values = dataRange.getValues();
    const allWorkInstructions = [];

    for (let i = 0; i < values.length; i++) {
      let [
        targetDate,
        startTime,
        endTime,
        category,
        otherDesc,
        memo,
        creatorName,
        workId,
        cancelFlag,
      ] = values[i];

      // Ensure time values are strings, as Google Sheets can return them as Date objects
      if (startTime instanceof Date) {
        startTime = Utilities.formatDate(startTime, 'JST', 'HH:mm');
      }
      if (endTime instanceof Date) {
        endTime = Utilities.formatDate(endTime, 'JST', 'HH:mm');
      }

      allWorkInstructions.push({
        workId: workId,
        date: Utilities.formatDate(new Date(targetDate), 'JST', 'yyyy/MM/dd'),
        startTime: startTime,
        endTime: endTime,
        category: category,
        otherDescription: otherDesc,
        memo: memo,
        creatorName: creatorName,
        isCancelled: cancelFlag === '中止',
      });
    }
    return allWorkInstructions;
  } catch (e) {
    Logger.log(e);
    throw new Error('全業務指示の取得に失敗しました: ' + e.message);
  }
}

function getAllDailyReportsInternal(dailyReportSheet) {
  try {
    const sheet = dailyReportSheet;
    if (!sheet || sheet.getLastRow() < 2) {
      return [];
    }
    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8); // A-H
    const values = dataRange.getValues();
    const allDailyReports = [];

    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      allDailyReports.push({
        internName: row[0], // A: インターン生名
        attendanceDate: Utilities.formatDate(new Date(row[1]), 'JST', 'yyyy/MM/dd'), // B: 出勤日
        satisfaction: row[2], // C: 今日の満足度
        workContent: row[3], // D: 業務内容
        impression: row[4], // E: 所感・学び
        managerFeedback: row[5], // F: 管理者フィードバック
        feedbackGiverName: row[6], // G: FB入力者名
        reportId: row[7], // H: 日報ID
      });
    }
    return allDailyReports;
  } catch (e) {
    Logger.log(e);
    throw new Error('全日報の取得に失敗しました: ' + e.message);
  }
}

// ----------------------------------------
// サーバーサイド関数 (詳細取得・軽量化向け)
// ----------------------------------------

function getShiftDetailsBundle(shiftId) {
  try {
    if (!shiftId) {
      throw new Error('シフトIDが指定されていません。');
    }
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const shiftSheet = ss.getSheetByName(SHEET_SHIFT);
    const dailyReportSheet = ss.getSheetByName(SHEET_DAILY_REPORT);

    const shiftInfo = getShiftByIdInternal(shiftId, shiftSheet);
    if (!shiftInfo) {
      return null;
    }

    const dailyReport = getDailyReportByInternAndDateInternal(
      shiftInfo.internName,
      shiftInfo.hopeDate,
      dailyReportSheet
    );

    return { shiftInfo: shiftInfo, dailyReport: dailyReport };
  } catch (e) {
    Logger.log(e);
    throw new Error('シフト詳細の取得に失敗しました: ' + e.message);
  }
}

function getWorkInstructionById(workId) {
  try {
    if (!workId) {
      throw new Error('予定IDが指定されていません。');
    }
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_WORK_INSTRUCTION);
    if (!sheet || sheet.getLastRow() < 2) {
      return null;
    }

    const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues(); // A-I
    for (let i = 0; i < values.length; i++) {
      let [
        targetDate,
        startTime,
        endTime,
        category,
        otherDesc,
        memo,
        creatorName,
        currentWorkId,
        cancelFlag,
      ] = values[i];
      if (currentWorkId !== workId) {
        continue;
      }

      if (startTime instanceof Date) {
        startTime = Utilities.formatDate(startTime, 'JST', 'HH:mm');
      }
      if (endTime instanceof Date) {
        endTime = Utilities.formatDate(endTime, 'JST', 'HH:mm');
      }

      return {
        workId: currentWorkId,
        date: Utilities.formatDate(new Date(targetDate), 'JST', 'yyyy/MM/dd'),
        startTime: startTime,
        endTime: endTime,
        category: category,
        otherDescription: otherDesc,
        memo: memo,
        creatorName: creatorName,
        isCancelled: cancelFlag === '中止',
      };
    }

    return null;
  } catch (e) {
    Logger.log(e);
    throw new Error('予定詳細の取得に失敗しました: ' + e.message);
  }
}

function getShiftByIdInternal(shiftId, shiftSheet) {
  try {
    const sheet = shiftSheet;
    if (!sheet || sheet.getLastRow() < 2) {
      return null;
    }
    const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 13).getValues(); // A-M
    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      if (row[8] !== shiftId) {
        continue;
      }

      let startTime = row[3];
      let endTime = row[4];
      if (startTime instanceof Date) {
        startTime = Utilities.formatDate(startTime, 'JST', 'HH:mm');
      }
      if (endTime instanceof Date) {
        endTime = Utilities.formatDate(endTime, 'JST', 'HH:mm');
      }

      return {
        rowNumber: i + 2,
        shiftId: row[8],
        applyDate: Utilities.formatDate(new Date(row[0]), 'JST', 'yyyy/MM/dd'),
        internName: row[1],
        hopeDate: Utilities.formatDate(new Date(row[2]), 'JST', 'yyyy/MM/dd'),
        startTime: startTime,
        endTime: endTime,
        status: row[5],
        workInstructionText: row[9] || '',
        workInstructionCreator: row[10] || '',
        workInstructionUpdated: row[11]
          ? Utilities.formatDate(new Date(row[11]), 'JST', 'yyyy/MM/dd HH:mm')
          : '',
        isCancelled: row[12] === '中止',
      };
    }
    return null;
  } catch (e) {
    Logger.log(e);
    throw new Error('シフト詳細の取得に失敗しました: ' + e.message);
  }
}

function getDailyReportByInternAndDateInternal(internName, attendanceDate, dailyReportSheet) {
  try {
    const sheet = dailyReportSheet;
    if (!sheet || sheet.getLastRow() < 2) {
      return null;
    }
    const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues(); // A-H
    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      const currentInternName = row[0];
      const currentDate = Utilities.formatDate(new Date(row[1]), 'JST', 'yyyy/MM/dd');
      if (currentInternName !== internName || currentDate !== attendanceDate) {
        continue;
      }
      return {
        internName: row[0],
        attendanceDate: currentDate,
        satisfaction: row[2],
        workContent: row[3],
        impression: row[4],
        managerFeedback: row[5],
        feedbackGiverName: row[6],
        reportId: row[7],
      };
    }
    return null;
  } catch (e) {
    Logger.log(e);
    throw new Error('日報詳細の取得に失敗しました: ' + e.message);
  }
}

// ----------------------------------------
// サーバーサイド関数 (初期データ取得)
// ----------------------------------------
function getInitialDataForUser(userName) {
  try {
    // Reset internColors and colorIndex for fresh assignment on each data load
    internColors = {};
    colorIndex = 0;

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const userSheet = ss.getSheetByName(SHEET_USER);
    const shiftSheet = ss.getSheetByName(SHEET_SHIFT);
    const workInstructionSheet = ss.getSheetByName(SHEET_WORK_INSTRUCTION);
    const dailyReportSheet = ss.getSheetByName(SHEET_DAILY_REPORT);

    let userInfo = getUserInfoByName(userName, userSheet);

    // If user is not found in the master sheet, treat them as a guest.
    if (!userInfo) {
      userInfo = { name: 'ゲスト', role: 'guest' };
    }

    const data = {
      userInfo: userInfo,
      calendarEvents: [],
      myShiftRequests: [],
      // Proactively fetch all data needed for client-side modal lookup
      allShifts: [],
      allWorkInstructions: [],
      allDailyReports: [],
      allInternNames: [],

      dailyReportsForIntern: [],
      dailyReportsForManager: [],
    };

    // Fetch data that EVERYONE needs (keep payload small)
    data.calendarEvents = getCalendarEventsInternal(ss, shiftSheet, workInstructionSheet);
    data.allWorkInstructions = [];
    data.allDailyReports = [];
    data.allShifts = [];

    // Fetch role-specific data
    if (userInfo.role === 'インターン生') {
      data.myShiftRequests = getMyShiftRequestsInternal(userInfo.name, shiftSheet);
      data.dailyReportsForIntern = getDailyReportsForInternInternal(
        userInfo.name,
        dailyReportSheet
      );
    } else if (userInfo.role === '採用担当' || userInfo.role === 'Dooox') {
      // Manager-specific data
      data.allShifts = [];
      data.allInternNames = [];
      data.dailyReportsForManager = [];
      // ALSO get personal data for testing purposes
      data.myShiftRequests = getMyShiftRequestsInternal(userInfo.name, shiftSheet);
      data.dailyReportsForIntern = getDailyReportsForInternInternal(
        userInfo.name,
        dailyReportSheet
      );
    }

    return data;
  } catch (e) {
    Logger.log(e);
    throw new Error('初期データの取得に失敗しました: ' + e.message);
  }
}

// ----------------------------------------
// サーバーサイド関数 (管理画面データ取得)
// ----------------------------------------
function getAdminShiftData(userName) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const userSheet = ss.getSheetByName(SHEET_USER);
    const shiftSheet = ss.getSheetByName(SHEET_SHIFT);
    const userInfo = getUserInfoByName(userName, userSheet);

    if (!userInfo || (userInfo.role !== '採用担当' && userInfo.role !== 'Dooox')) {
      throw new Error('この操作を行う権限がありません。');
    }

    return {
      allShifts: getAllShiftsInternal(shiftSheet),
      allInternNames: getAllInternNamesInternal(userSheet),
    };
  } catch (e) {
    Logger.log(e);
    throw new Error('管理画面データの取得に失敗しました: ' + e.message);
  }
}

function getDailyReportManagementData(userName) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const userSheet = ss.getSheetByName(SHEET_USER);
    const dailyReportSheet = ss.getSheetByName(SHEET_DAILY_REPORT);
    const userInfo = getUserInfoByName(userName, userSheet);

    if (!userInfo || (userInfo.role !== '採用担当' && userInfo.role !== 'Dooox')) {
      throw new Error('この操作を行う権限がありません。');
    }

    return {
      dailyReportsForManager: getDailyReportsForManagerInternal(dailyReportSheet),
      allInternNames: getAllInternNamesInternal(userSheet),
    };
  } catch (e) {
    Logger.log(e);
    throw new Error('日報管理データの取得に失敗しました: ' + e.message);
  }
}

// ----------------------------------------
// サーバーサイド関数 (カレンダーのみ再取得)
// ----------------------------------------
function getCalendarEventsOnly() {
  try {
    internColors = {};
    colorIndex = 0;

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const shiftSheet = ss.getSheetByName(SHEET_SHIFT);
    const workInstructionSheet = ss.getSheetByName(SHEET_WORK_INSTRUCTION);

    return getCalendarEventsInternal(ss, shiftSheet, workInstructionSheet);
  } catch (e) {
    Logger.log(e);
    throw new Error('カレンダー更新に失敗しました: ' + e.message);
  }
}

// ----------------------------------------
// サーバーサイド関数 (シフト申請)
// ----------------------------------------

function submitShiftRequest(formData, userName) {
  try {
    Logger.log('Entering submitShiftRequest for user: ' + userName);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const userSheet = ss.getSheetByName(SHEET_USER);
    const userInfo = getUserInfoByName(userName, userSheet);

    if (!userInfo || (userInfo.role === 'guest' && userInfo.role !== 'Dooox')) {
      throw new Error('ユーザーマスタにあなたのアカウント(' + userName + ')が登録されていません。');
    }

    const sheet = ss.getSheetByName(SHEET_SHIFT);
    if (!sheet) {
      throw new Error('シート名「' + SHEET_SHIFT + '」が見つかりません。');
    }

    const internName = userInfo.name;
    const newHopeDate = new Date(formData.hopeDate);
    const newStartTime = formData.startTime;
    const newEndTime = formData.endTime;

    if (formData.shiftId) {
      // Modification
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][8] === formData.shiftId) {
          // I列: シフトID
          const rowNumber = i + 1;
          const currentInternName = data[i][1]; // B列: インターン生名
          const currentStatus = data[i][5]; // F列: ステータス

          if (currentInternName !== internName) {
            throw new Error('このシフトはあなたの申請ではありません。');
          }
          if (currentStatus !== '希望中') {
            throw new Error('「希望中」のシフトのみ変更できます。');
          }

          sheet.getRange(rowNumber, 3).setValue(newHopeDate); // C: 希望日
          sheet.getRange(rowNumber, 4).setValue(newStartTime); // D: 開始時刻
          sheet.getRange(rowNumber, 5).setValue(newEndTime); // E: 終了時刻

          const currentHistory = sheet.getRange(rowNumber, 8).getValue(); // H列
          const timestamp = Utilities.formatDate(new Date(), 'JST', 'yyyy/MM/dd HH:mm');
          const newHistoryEntry = `${timestamp} ${internName}が変更`;
          const updatedHistory = currentHistory
            ? `${currentHistory}\n${newHistoryEntry}`
            : newHistoryEntry;
          sheet.getRange(rowNumber, 8).setValue(updatedHistory);

          SpreadsheetApp.flush();
          const managerEmails = getEmailsByRoles(['採用担当', 'Dooox'], userSheet);
          Logger.log('N-01 notify managers (modify): ' + managerEmails.join(','));
          if (managerEmails.length > 0) {
            const subject = '【シフト申請変更】' + internName;
            const body =
              'シフト申請が変更されました。\n\n' +
              '氏名: ' +
              internName +
              '\n希望日: ' +
              Utilities.formatDate(newHopeDate, 'JST', 'yyyy/MM/dd') +
              '\n希望時間: ' +
              newStartTime +
              '〜' +
              newEndTime;
            sendMailSafe({ to: managerEmails.join(','), subject: subject, body: body });
          }
          Logger.log('submitShiftRequest(modify) success shiftId=' + formData.shiftId);
          return {
            message: 'シフト申請を変更しました。',
            shift: {
              shiftId: formData.shiftId,
              applyDate: Utilities.formatDate(new Date(data[i][0]), 'JST', 'yyyy/MM/dd'),
              internName: internName,
              hopeDate: Utilities.formatDate(newHopeDate, 'JST', 'yyyy/MM/dd'),
              startTime: newStartTime,
              endTime: newEndTime,
              status: '希望中',
            },
          };
        }
      }
      throw new Error('変更するシフトが見つかりませんでした。');
    } else {
      // New application
      const applyDate = new Date();
      const status = '希望中';
      const uniqueId = 'S-' + new Date().getTime();

      const newRow = [
        applyDate,
        internName,
        newHopeDate,
        newStartTime,
        newEndTime,
        status,
        '', // G: 確定者名
        '', // H: 変更履歴
        uniqueId, // I: シフトID
      ];

      sheet.appendRow(newRow);

      SpreadsheetApp.flush();
      const managerEmails = getEmailsByRoles(['採用担当', 'Dooox'], userSheet);
      Logger.log('N-01 notify managers (new): ' + managerEmails.join(','));
      if (managerEmails.length > 0) {
        const subject = '【シフト申請】' + internName;
        const body =
          'シフト申請が提出されました。\n\n' +
          '氏名: ' +
          internName +
          '\n希望日: ' +
          Utilities.formatDate(newHopeDate, 'JST', 'yyyy/MM/dd') +
          '\n希望時間: ' +
          newStartTime +
          '〜' +
          newEndTime;
        sendMailSafe({ to: managerEmails.join(','), subject: subject, body: body });
      }
      Logger.log('submitShiftRequest(new) success shiftId=' + uniqueId);
      return {
        message: 'シフト希望を申請しました。',
        shift: {
          shiftId: uniqueId,
          applyDate: Utilities.formatDate(applyDate, 'JST', 'yyyy/MM/dd'),
          internName: internName,
          hopeDate: Utilities.formatDate(newHopeDate, 'JST', 'yyyy/MM/dd'),
          startTime: newStartTime,
          endTime: newEndTime,
          status: status,
        },
      };
    }
  } catch (e) {
    Logger.log(e);
    throw new Error('申請に失敗しました：' + e.message);
  }
}

function getMyShiftRequestsInternal(internName, shiftSheet) {
  try {
    Logger.log('Entering getMyShiftRequestsInternal');
    const sheet = shiftSheet;
    if (!sheet || sheet.getLastRow() < 2) {
      Logger.log(`No shifts found for ${internName} or sheet is empty.`);
      return [];
    }

    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9);
    const values = dataRange.getValues();
    const myRequests = [];

    for (let i = values.length - 1; i >= 0; i--) {
      // Iterate backwards to get newest first
      const row = values[i];
      const currentInternName = row[1]; // B列: インターン生名

      if (currentInternName === internName) {
        let startTime = row[3];
        let endTime = row[4];

        if (startTime instanceof Date) {
          startTime = Utilities.formatDate(startTime, 'JST', 'HH:mm');
        }
        if (endTime instanceof Date) {
          endTime = Utilities.formatDate(endTime, 'JST', 'HH:mm');
        }

        myRequests.push({
          shiftId: row[8], // I列: シフトID
          hopeDate: Utilities.formatDate(new Date(row[2]), 'JST', 'yyyy/MM/dd'),
          startTime: startTime,
          endTime: endTime,
          status: row[5], // F列: ステータス
        });
      }
    }
    return myRequests;
  } catch (e) {
    Logger.log(e);
    throw new Error('申請済みシフトの取得に失敗しました：' + e.message);
  }
}

// ----------------------------------------
// サーバーサイド関数 (日報入力)
// ----------------------------------------

function submitReport(formData, userName) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const userSheet = ss.getSheetByName(SHEET_USER);
    const userInfo = getUserInfoByName(userName, userSheet);

    if (
      !userInfo ||
      (userInfo.role !== 'インターン生' &&
        userInfo.role !== '採用担当' &&
        userInfo.role !== 'Dooox')
    ) {
      throw new Error('日報の提出権限がありません。');
    }

    const sheet = ss.getSheetByName(SHEET_DAILY_REPORT);
    if (!sheet) {
      throw new Error('シート名「' + SHEET_DAILY_REPORT + '」が見つかりません。');
    }

    const uniqueId = 'DR-' + new Date().getTime(); // Daily Report ID

    const newRow = [
      userInfo.name, // A: インターン生名
      new Date(formData.attendanceDate), // B: 出勤日
      parseInt(formData.satisfaction), // C: 今日の満足度
      formData.workContent, // D: 業務内容
      formData.impression, // E: 所感・学び
      '', // F: 管理者フィードバック (initially empty)
      '', // G: FB入力者名 (initially empty)
      uniqueId, // H: 日報ID
    ];

    sheet.appendRow(newRow);

    const managerEmails = getEmailsByRoles(['採用担当', 'Dooox'], userSheet);
    if (managerEmails.length > 0) {
      const subject = '【日報提出】' + userInfo.name;
      const body =
        '日報が提出されました。\n\n' +
        '氏名: ' +
        userInfo.name +
        '\n出勤日: ' +
        Utilities.formatDate(new Date(formData.attendanceDate), 'JST', 'yyyy/MM/dd');
      sendMailSafe({ to: managerEmails.join(','), subject: subject, body: body });
    }

    return '日報を提出しました。';
  } catch (e) {
    Logger.log(e);
    throw new Error('日報の提出に失敗しました：' + e.message);
  }
}

// ----------------------------------------
// サーバーサイド関数 (業務指示)
// ----------------------------------------

function submitWorkInstruction(formData, userName) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const userSheet = ss.getSheetByName(SHEET_USER);
    const userInfo = getUserInfoByName(userName, userSheet);

    if (!userInfo || (userInfo.role !== '採用担当' && userInfo.role !== 'Dooox')) {
      throw new Error('採用担当またはDoooxのみ予定を作成できます。');
    }

    const sheet = ss.getSheetByName(SHEET_WORK_INSTRUCTION);
    if (!sheet) {
      throw new Error('シート名「' + SHEET_WORK_INSTRUCTION + '」が見つかりません。');
    }

    const uniqueId = 'WI-' + new Date().getTime(); // Work Instruction ID

    const newRow = [
      new Date(formData.targetDate),
      formData.startTime, // B: 開始時刻
      formData.endTime, // C: 終了時刻
      formData.workCategory, // D: 業務カテゴリ
      formData.otherDescription || '', // E: その他詳細
      formData.memo || '', // F: メモ (New)
      userInfo.name, // G: 作成者名
      uniqueId, // H: 予定ID
    ];

    sheet.appendRow(newRow);

    return {
      message: '予定を作成しました。',
      workInstruction: {
        workId: uniqueId,
        date: Utilities.formatDate(new Date(formData.targetDate), 'JST', 'yyyy/MM/dd'),
        startTime: formData.startTime,
        endTime: formData.endTime,
        category: formData.workCategory,
        otherDescription: formData.otherDescription || '',
        memo: formData.memo || '',
        creatorName: userInfo.name,
      },
    };
  } catch (e) {
    Logger.log(e);
    throw new Error('予定の作成に失敗しました：' + e.message);
  }
}

// ----------------------------------------
// サーバーサイド関数 (日報管理)
// ----------------------------------------

function getDailyReportsForManagerInternal(dailyReportSheet) {
  try {
    const sheet = dailyReportSheet;
    if (!sheet) {
      throw new Error('シート名「' + SHEET_DAILY_REPORT + '」が見つかりません。');
    }
    if (sheet.getLastRow() < 2) {
      return [];
    }

    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8); // A-H
    const values = dataRange.getValues();
    const dailyReports = [];

    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      dailyReports.push({
        rowNumber: i + 2, // For updating feedback
        internName: row[0], // A: インターン生名
        attendanceDate: Utilities.formatDate(new Date(row[1]), 'JST', 'yyyy/MM/dd'), // B: 出勤日
        satisfaction: row[2], // C: 今日の満足度
        workContent: row[3], // D: 業務内容
        impression: row[4], // E: 所感・学び
        managerFeedback: row[5], // F: 管理者フィードバック
        feedbackGiverName: row[6], // G: FB入力者名
        reportId: row[7], // H: 日報ID
      });
    }
    return dailyReports;
  } catch (e) {
    Logger.log(e);
    throw new Error('日報データの取得に失敗しました：' + e.message);
  }
}

function submitFeedback(rowNumber, reportId, feedbackContent, userName) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const userSheet = ss.getSheetByName(SHEET_USER);
    const userInfo = getUserInfoByName(userName, userSheet);

    if (!userInfo || (userInfo.role !== '採用担当' && userInfo.role !== 'Dooox')) {
      throw new Error('採用担当またはDoooxのみフィードバックを登録できます。');
    }

    const sheet = ss.getSheetByName(SHEET_DAILY_REPORT);

    if (rowNumber > sheet.getLastRow() || rowNumber < 2) {
      throw new Error('指定された日報の行が見つかりません。');
    }

    const existingReportId = sheet.getRange(rowNumber, 8).getValue(); // H列
    if (existingReportId !== reportId) {
      throw new Error('日報IDが一致しません。不正な操作の可能性があります。');
    }

    sheet.getRange(rowNumber, 6).setValue(feedbackContent); // F列 (管理者フィードバック)
    sheet.getRange(rowNumber, 7).setValue(userInfo.name); // G列 (FB入力者名)

    const internName = sheet.getRange(rowNumber, 1).getValue();
    const internEmails = getEmailByName(internName, userSheet);
    if (internEmails.length > 0) {
      const subject = '【日報FB完了】' + internName;
      const body =
        '管理者からのフィードバックが登録されました。\n\n' +
        '氏名: ' +
        internName +
        '\n管理者: ' +
        userInfo.name;
      sendMailSafe({ to: internEmails.join(','), subject: subject, body: body });
    }

    return 'フィードバックを登録しました。';
  } catch (e) {
    Logger.log(e);
    throw new Error('フィードバックの登録に失敗しました：' + e.message);
  }
}

// ----------------------------------------
// サーバーサイド関数 (インターン生向け日報閲覧)
// ----------------------------------------

function getDailyReportsForInternInternal(internName, dailyReportSheet) {
  try {
    const sheet = dailyReportSheet;
    if (!sheet) {
      throw new Error('シート名「' + SHEET_DAILY_REPORT + '」が見つかりません。');
    }
    if (sheet.getLastRow() < 2) {
      return [];
    }

    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8); // A-H
    const values = dataRange.getValues();
    const dailyReports = [];

    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      const currentInternName = row[0]; // A列: インターン生名

      if (currentInternName === internName) {
        dailyReports.push({
          attendanceDate: Utilities.formatDate(new Date(row[1]), 'JST', 'yyyy/MM/dd'), // B: 出勤日
          satisfaction: row[2], // C: 今日の満足度
          workContent: row[3], // D: 業務内容
          impression: row[4], // E: 所感・学び
          managerFeedback: row[5], // F: 管理者フィードバック
          feedbackGiverName: row[6], // G: FB入力者名
          reportId: row[7], // H: 日報ID
        });
      }
    }
    return dailyReports;
  } catch (e) {
    Logger.log(e);
    throw new Error('日報データの取得に失敗しました：' + e.message);
  }
}

/**
 * [新設ヘルパー関数] ユーザーマスタから全ユーザーの氏名と権限のリストを取得する
 */
function getUsers() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    if (!ss) {
      return {
        isError: true,
        errorMessage: `スプレッドシートが見つかりません。ID: ${SPREADSHEET_ID}`,
      };
    }
    const sheet = ss.getSheetByName(SHEET_USER);
    if (!sheet) {
      return { isError: true, errorMessage: `シート名「${SHEET_USER}」が見つかりません。` };
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return {
        isError: false,
        debugInfo: `ユーザーマスタの最終行が${lastRow}でした。2行目以降にデータがあるかご確認ください。`,
      };
    }

    const dataRange = sheet.getRange(2, 1, lastRow - 1, 2); // A-B列, starting from row 2
    const values = dataRange.getValues();

    if (values.length === 0) {
      return {
        isError: false,
        debugInfo: `データ範囲(2行目以降)から値が取得できませんでした。getLastRow=${lastRow}。範囲の開始行や列を確認してください。`,
      };
    }

    const users = values
      .map(row => ({
        name: row[0], // A列: 氏名
        role: row[1] ? row[1].trim() : '', // B列: 権限
      }))
      .filter(user => user.name); // 名前が空の行は除外

    if (users.length === 0 && values.length > 0) {
      return {
        isError: false,
        debugInfo: `データは取得できましたが、すべてのユーザー名が空欄でした。A列をご確認ください。`,
      };
    }

    return users; // If all good, return actual users
  } catch (e) {
    Logger.log(`getUsers Error: ${e.toString()}`);
    return {
      isError: true,
      errorMessage: `ユーザーリストの取得に失敗しました: ${e.message}`,
      debugInfo: e.toString(),
    };
  }
}

/**
 * [新設ヘルパー関数] 氏名からユーザーマスタを検索し、氏名と権限を取得する
 */
function getUserInfoByName(name, userSheet) {
  const sheet = userSheet;
  if (!sheet) {
    Logger.log('シート名「' + SHEET_USER + '」が見つかりません。');
    return null;
  }
  if (sheet.getLastRow() < 2) {
    return null;
  }
  const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2);
  const values = dataRange.getValues();
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const rowName = row[0]; // A列: 氏名
    if (rowName === name) {
      return {
        name: row[0],
        role: row[1] ? row[1].trim() : '',
      };
    }
  }
  return null; // 見つからなかった場合
}

// ----------------------------------------
// ヘルパー関数 (インターン生名取得)
// ----------------------------------------
function getAllInternNamesInternal(userSheet) {
  try {
    const sheet = userSheet;

    if (!sheet) {
      throw new Error('シート名「' + SHEET_USER + '」が見つかりません。');
    }
    if (sheet.getLastRow() < 2) {
      return [];
    }

    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2); // A-B
    const values = dataRange.getValues();
    const internNames = [];

    values.forEach(row => {
      const name = row[0]; // A列: 氏名
      const role = row[1]; // B列: 権限
      if (role && role.trim() === 'インターン生') {
        internNames.push(name);
      }
    });
    return internNames;
  } catch (e) {
    Logger.log(e);
    throw new Error('インターン生名の取得に失敗しました：' + e.message);
  }
}

// ----------------------------------------
// サーバーサイド関数 (カレンダー表示)
// ----------------------------------------

function getCalendarEventsInternal(ss, shiftSheet, workInstructionSheet) {
  try {
    const events = [];

    // 1. Get Shift Events
    const sheet = shiftSheet;
    if (sheet && sheet.getLastRow() >= 2) {
      const shiftValues = sheet.getRange(2, 1, sheet.getLastRow() - 1, 13).getValues(); // A-M
      for (const row of shiftValues) {
        const [
          applyDate,
          internName,
          hopeDate,
          startTime,
          endTime,
          status,
          ,
          ,
          shiftId,
          workInstructionText,
          ,
          ,
          cancelFlag,
        ] = row;
        if (status === '確定' && internName && hopeDate && startTime && endTime) {
          const startDateTime = new Date(hopeDate);
          startDateTime.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
          const endDateTime = new Date(hopeDate);
          endDateTime.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);

          // Assign color to intern
          if (!internColors[internName]) {
            internColors[internName] = COLOR_PALETTE[colorIndex % COLOR_PALETTE.length];
            colorIndex++;
          }

          events.push({
            title: `${internName} ${Utilities.formatDate(startDateTime, 'JST', 'HH:mm')}~${Utilities.formatDate(endDateTime, 'JST', 'HH:mm')}`,
            start: startDateTime.toISOString(),
            end: endDateTime.toISOString(),
            extendedProps: {
              shiftId: shiftId,
              type: 'shift',
              internName: internName,
              workInstruction: workInstructionText || '',
              internColor: internColors[internName], // Add intern color
              isCancelled: cancelFlag === '中止',
            },
          });
        }
      }
    }

    // 2. Get Work Instruction Events (now called Schedule Events)
    const instructionSheet = workInstructionSheet;
    if (instructionSheet && instructionSheet.getLastRow() >= 2) {
      const instructionValues = instructionSheet
        .getRange(2, 1, instructionSheet.getLastRow() - 1, 9)
        .getValues(); // A-H
      for (const row of instructionValues) {
        let [
          targetDate,
          startTime,
          endTime,
          category,
          otherDesc,
          memo,
          creatorName,
          workId,
          cancelFlag,
        ] = row;
        if (targetDate && category && startTime && endTime) {
          // Ensure time values are strings, as Google Sheets can return them as Date objects
          if (startTime instanceof Date) {
            startTime = Utilities.formatDate(startTime, 'JST', 'HH:mm');
          }
          if (endTime instanceof Date) {
            endTime = Utilities.formatDate(endTime, 'JST', 'HH:mm');
          }

          const title = category === 'その他' && otherDesc ? otherDesc : category;

          const startDateTime = new Date(targetDate);
          const [startHours, startMinutes] = startTime.split(':');
          startDateTime.setHours(startHours, startMinutes, 0, 0);

          const endDateTime = new Date(targetDate);
          const [endHours, endMinutes] = endTime.split(':');
          endDateTime.setHours(endHours, endMinutes, 0, 0);

          events.push({
            title: title,
            start: startDateTime.toISOString(),
            end: endDateTime.toISOString(),
            extendedProps: {
              workId: workId,
              type: 'instruction',
              category: category,
              formattedStartTime: Utilities.formatDate(startDateTime, 'JST', 'HH:mm'),
              formattedEndTime: Utilities.formatDate(endDateTime, 'JST', 'HH:mm'),
              isCancelled: cancelFlag === '中止',
            },
          });
        }
      }
    }

    return events;
  } catch (e) {
    Logger.log(e);
    throw new Error('カレンダーデータの取得に失敗しました: ' + e.message);
  }
}

function updateScheduleMemo(workId, newMemo) {
  try {
    if (!workId) {
      throw new Error('予定IDが指定されていません。');
    }
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_WORK_INSTRUCTION);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][7] === workId) {
        // H列: 予定ID
        sheet.getRange(i + 1, 6).setValue(newMemo); // F列: メモ
        return 'メモを更新しました。';
      }
    }
    throw new Error('指定された予定が見つかりません。');
  } catch (e) {
    Logger.log(e);
    throw new Error('メモの更新に失敗しました: ' + e.message);
  }
}

function updateFullSchedule(formData) {
  try {
    if (!formData.workId) {
      throw new Error('予定IDが指定されていません。');
    }
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_WORK_INSTRUCTION);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][7] === formData.workId) {
        // H列: 予定ID
        const rowNumber = i + 1;
        sheet.getRange(rowNumber, 1).setValue(new Date(formData.targetDate)); // A: 日付
        sheet.getRange(rowNumber, 2).setValue(formData.startTime); // B: 開始時刻
        sheet.getRange(rowNumber, 3).setValue(formData.endTime); // C: 終了時刻
        sheet.getRange(rowNumber, 4).setValue(formData.workCategory); // D: カテゴリ
        sheet.getRange(rowNumber, 5).setValue(formData.otherDescription || ''); // E: その他詳細
        sheet.getRange(rowNumber, 6).setValue(formData.memo || ''); // F: メモ
        // G: 作成者名 (unchanged)
        // H: 予定ID (unchanged)
        return '予定を更新しました。';
      }
    }
    throw new Error('指定された予定が見つかりません。');
  } catch (e) {
    Logger.log(e);
    throw new Error('予定の更新に失敗しました: ' + e.message);
  }
}

function deleteSchedule(workId) {
  try {
    if (!workId) {
      throw new Error('予定IDが指定されていません。');
    }
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_WORK_INSTRUCTION);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][7] === workId) {
        // H列: 予定ID
        sheet.deleteRow(i + 1);
        return '予定を削除しました。';
      }
    }
    throw new Error('指定された予定が見つかりません。');
  } catch (e) {
    Logger.log(e);
    throw new Error('予定の削除に失敗しました: ' + e.message);
  }
}

// ----------------------------------------
// サーバーサイド関数 (中止フラグ)
// ----------------------------------------

function cancelShift(shiftId, userName) {
  try {
    if (!shiftId) {
      throw new Error('シフトIDが指定されていません。');
    }
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const userSheet = ss.getSheetByName(SHEET_USER);
    const userInfo = getUserInfoByName(userName, userSheet);
    if (!userInfo) {
      throw new Error('ユーザー情報が取得できません。');
    }

    const sheet = ss.getSheetByName(SHEET_SHIFT);
    if (!sheet || sheet.getLastRow() < 2) {
      throw new Error('シフトシートが見つかりません。');
    }

    const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 13).getValues(); // A-M
    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      if (row[8] === shiftId) {
        sheet.getRange(i + 2, 13).setValue('中止'); // M列
        return '中止しました。';
      }
    }
    throw new Error('対象のシフトが見つかりません。');
  } catch (e) {
    Logger.log(e);
    throw new Error('中止に失敗しました: ' + e.message);
  }
}

function cancelWorkInstruction(workId, userName) {
  try {
    if (!workId) {
      throw new Error('予定IDが指定されていません。');
    }
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const userSheet = ss.getSheetByName(SHEET_USER);
    const userInfo = getUserInfoByName(userName, userSheet);
    if (!userInfo) {
      throw new Error('ユーザー情報が取得できません。');
    }

    const sheet = ss.getSheetByName(SHEET_WORK_INSTRUCTION);
    if (!sheet || sheet.getLastRow() < 2) {
      throw new Error('業務指示シートが見つかりません。');
    }

    const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues(); // A-I
    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      if (row[7] === workId) {
        sheet.getRange(i + 2, 9).setValue('中止'); // I列
        return '中止しました。';
      }
    }
    throw new Error('対象の予定が見つかりません。');
  } catch (e) {
    Logger.log(e);
    throw new Error('中止に失敗しました: ' + e.message);
  }
}

function uncancelShift(shiftId, userName) {
  try {
    if (!shiftId) {
      throw new Error('シフトIDが指定されていません。');
    }
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const userSheet = ss.getSheetByName(SHEET_USER);
    const userInfo = getUserInfoByName(userName, userSheet);
    if (!userInfo) {
      throw new Error('ユーザー情報が取得できません。');
    }

    const sheet = ss.getSheetByName(SHEET_SHIFT);
    if (!sheet || sheet.getLastRow() < 2) {
      throw new Error('シフトシートが見つかりません。');
    }

    const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 13).getValues(); // A-M
    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      if (row[8] === shiftId) {
        sheet.getRange(i + 2, 13).setValue(''); // M列
        return '中止を解除しました。';
      }
    }
    throw new Error('対象のシフトが見つかりません。');
  } catch (e) {
    Logger.log(e);
    throw new Error('中止解除に失敗しました: ' + e.message);
  }
}

function uncancelWorkInstruction(workId, userName) {
  try {
    if (!workId) {
      throw new Error('予定IDが指定されていません。');
    }
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const userSheet = ss.getSheetByName(SHEET_USER);
    const userInfo = getUserInfoByName(userName, userSheet);
    if (!userInfo) {
      throw new Error('ユーザー情報が取得できません。');
    }

    const sheet = ss.getSheetByName(SHEET_WORK_INSTRUCTION);
    if (!sheet || sheet.getLastRow() < 2) {
      throw new Error('業務指示シートが見つかりません。');
    }

    const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues(); // A-I
    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      if (row[7] === workId) {
        sheet.getRange(i + 2, 9).setValue(''); // I列
        return '中止を解除しました。';
      }
    }
    throw new Error('対象の予定が見つかりません。');
  } catch (e) {
    Logger.log(e);
    throw new Error('中止解除に失敗しました: ' + e.message);
  }
}

// ----------------------------------------
// サーバーサイド関数 (管理者用)
// ----------------------------------------

function getAllShiftsInternal(shiftSheet) {
  try {
    const sheet = shiftSheet;

    if (sheet.getLastRow() < 2) {
      return [];
    }

    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, 13); // A-M
    const values = dataRange.getValues();
    const allShifts = [];

    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      // Skip if row is empty
      if (row[1] === '' || row[2] === '') continue;

      let startTime = row[3];
      let endTime = row[4];

      if (startTime instanceof Date) {
        startTime = Utilities.formatDate(startTime, 'JST', 'HH:mm');
      }
      if (endTime instanceof Date) {
        endTime = Utilities.formatDate(endTime, 'JST', 'HH:mm');
      }

      allShifts.push({
        rowNumber: i + 2,
        shiftId: row[8],
        applyDate: Utilities.formatDate(new Date(row[0]), 'JST', 'yyyy/MM/dd'),
        internName: row[1],
        hopeDate: Utilities.formatDate(new Date(row[2]), 'JST', 'yyyy/MM/dd'),
        startTime: startTime,
        endTime: endTime,
        status: row[5],
        workInstructionText: row[9] || '', // J列: 業務指示
        workInstructionCreator: row[10] || '', // K列: 作成者
        workInstructionUpdated: row[11]
          ? Utilities.formatDate(new Date(row[11]), 'JST', 'yyyy/MM/dd HH:mm')
          : '', // L列: 更新日時
        isCancelled: row[12] === '中止', // M列: 中止フラグ
      });
    }
    return allShifts;
  } catch (e) {
    Logger.log(e);
    throw new Error('全シフト情報の取得に失敗しました: ' + e.message);
  }
}

// ----------------------------------------
// サーバーサイド関数 (シフト承認・棄却)
// ----------------------------------------

function approveShift(rowNumber, shiftId, approverName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_SHIFT);
  return updateShiftStatus(ss, sheet, rowNumber, shiftId, '確定', approverName, '承認');
}

function rejectShift(rowNumber, shiftId, approverName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_SHIFT);
  return updateShiftStatus(ss, sheet, rowNumber, shiftId, '棄却', approverName, '棄却');
}

function updateShiftStatus(ss, sheet, rowNumber, shiftId, newStatus, updaterName, actionType) {
  try {
    if (rowNumber > sheet.getLastRow() || rowNumber < 2) {
      throw new Error('指定されたシフトの行が見つかりません。');
    }

    const existingShiftId = sheet.getRange(rowNumber, 9).getValue(); // I列
    if (existingShiftId !== shiftId) {
      throw new Error('シフトIDが一致しません。不正な操作の可能性があります。');
    }

    sheet.getRange(rowNumber, 6).setValue(newStatus); // F列 (ステータス)
    sheet.getRange(rowNumber, 7).setValue(updaterName); // G列 (確定者名)

    const currentHistory = sheet.getRange(rowNumber, 8).getValue(); // H列
    const timestamp = Utilities.formatDate(new Date(), 'JST', 'yyyy/MM/dd HH:mm');
    const newHistoryEntry = `${timestamp} ${updaterName}が${actionType}`;
    const updatedHistory = currentHistory
      ? `${currentHistory}\n${newHistoryEntry}`
      : newHistoryEntry;
    sheet.getRange(rowNumber, 8).setValue(updatedHistory);

    if (newStatus === '確定') {
      const userSheet = ss.getSheetByName(SHEET_USER);
      const internName = sheet.getRange(rowNumber, 2).getValue();
      const internEmails = getEmailByName(internName, userSheet);
      if (internEmails.length > 0) {
        const hopeDate = sheet.getRange(rowNumber, 3).getValue();
        const startTime = sheet.getRange(rowNumber, 4).getValue();
        const endTime = sheet.getRange(rowNumber, 5).getValue();
        const startText =
          startTime instanceof Date ? Utilities.formatDate(startTime, 'JST', 'HH:mm') : startTime;
        const endText =
          endTime instanceof Date ? Utilities.formatDate(endTime, 'JST', 'HH:mm') : endTime;
        const subject = '【シフト確定】' + internName;
        const body =
          'シフトが承認され確定しました。\n\n' +
          '氏名: ' +
          internName +
          '\n希望日: ' +
          Utilities.formatDate(new Date(hopeDate), 'JST', 'yyyy/MM/dd') +
          '\n希望時間: ' +
          startText +
          '〜' +
          endText +
          '\n承認者: ' +
          updaterName;
        sendMailSafe({ to: internEmails.join(','), subject: subject, body: body });
      }
    }

    return `シフトを${actionType}しました。`;
  } catch (e) {
    Logger.log(e);
    throw new Error(`シフトの${actionType}に失敗しました: ${e.message}`);
  }
}

function adminCreateShift(formData, userName) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const userSheet = ss.getSheetByName(SHEET_USER);
    const userInfo = getUserInfoByName(userName, userSheet);

    if (!userInfo || (userInfo.role !== '採用担当' && userInfo.role !== 'Dooox')) {
      throw new Error('この操作を行う権限がありません。');
    }

    const sheet = ss.getSheetByName(SHEET_SHIFT);
    if (!sheet) {
      throw new Error('シート名「' + SHEET_SHIFT + '」が見つかりません。');
    }

    if (
      !formData.internName ||
      !formData.hopeDate ||
      !formData.startTime ||
      !formData.endTime ||
      !formData.status
    ) {
      throw new Error('必須項目が不足しています。');
    }

    const applyDate = new Date();
    const uniqueId = 'S-' + new Date().getTime();
    const approverName = formData.status === '確定' ? userInfo.name : '';
    const history =
      formData.status === '確定'
        ? `${Utilities.formatDate(new Date(), 'JST', 'yyyy/MM/dd HH:mm')} ${userInfo.name}が作成・承認`
        : '';

    const newRow = [
      applyDate,
      formData.internName,
      new Date(formData.hopeDate),
      formData.startTime,
      formData.endTime,
      formData.status,
      approverName, // G: 確定者名
      history, // H: 変更履歴
      uniqueId, // I: シフトID
    ];

    sheet.appendRow(newRow);
    SpreadsheetApp.flush();
    return {
      message: '新規シフトを作成しました。',
      shift: {
        shiftId: uniqueId,
        internName: formData.internName,
        hopeDate: Utilities.formatDate(new Date(formData.hopeDate), 'JST', 'yyyy/MM/dd'),
        startTime: formData.startTime,
        endTime: formData.endTime,
        status: formData.status,
      },
    };
  } catch (e) {
    Logger.log(e);
    throw new Error('シフトの作成に失敗しました: ' + e.message);
  }
}

// ----------------------------------------
// サーバーサイド関数 (業務指示 - シフト連動)
// ----------------------------------------

function saveWorkInstructionForShift(shiftId, instructionText, userName) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const userSheet = ss.getSheetByName(SHEET_USER);
    const userInfo = getUserInfoByName(userName, userSheet);

    if (!userInfo || (userInfo.role !== '採用担当' && userInfo.role !== 'Dooox')) {
      throw new Error('業務指示を保存する権限がありません。');
    }

    const sheet = ss.getSheetByName(SHEET_SHIFT);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][8] === shiftId) {
        // I列: シフトID
        const rowNumber = i + 1;
        sheet.getRange(rowNumber, 10).setValue(instructionText); // J: 業務指示内容
        sheet.getRange(rowNumber, 11).setValue(userInfo.name); // K: 作成者名
        sheet.getRange(rowNumber, 12).setValue(new Date()); // L: 更新日時
        return '業務指示を保存しました。';
      }
    }
    throw new Error('対象のシフトが見つかりませんでした。');
  } catch (e) {
    Logger.log(e);
    throw new Error('業務指示の保存に失敗しました: ' + e.message);
  }
}

function deleteWorkInstructionForShift(shiftId, userName) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const userSheet = ss.getSheetByName(SHEET_USER);
    const userInfo = getUserInfoByName(userName, userSheet);

    if (!userInfo || (userInfo.role !== '採用担当' && userInfo.role !== 'Dooox')) {
      throw new Error('業務指示を削除する権限がありません。');
    }

    const sheet = ss.getSheetByName(SHEET_SHIFT);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][8] === shiftId) {
        // I列: シフトID
        const rowNumber = i + 1;
        sheet.getRange(rowNumber, 10, 1, 3).clearContent(); // J, K, Lをクリア
        return '業務指示を削除しました。';
      }
    }
    throw new Error('対象のシフトが見つかりませんでした。');
  } catch (e) {
    Logger.log(e);
    throw new Error('業務指示の削除に失敗しました: ' + e.message);
  }
}

function cancelShiftRequest(shiftId, internName) {
  try {
    if (!shiftId) {
      throw new Error('シフトIDが指定されていません。');
    }
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_SHIFT);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][8] === shiftId) {
        // I列: シフトID
        const rowNumber = i + 1;
        const currentInternName = data[i][1]; // B列: インターン生名
        const currentStatus = data[i][5]; // F列: ステータス

        if (currentInternName !== internName) {
          throw new Error('このシフトはあなたの申請ではありません。');
        }
        if (currentStatus !== '希望中') {
          throw new Error('「希望中」のシフトのみキャンセルできます。');
        }

        sheet.getRange(rowNumber, 6).setValue('キャンセル済み'); // F列 (ステータス)
        const currentHistory = sheet.getRange(rowNumber, 8).getValue(); // H列
        const timestamp = Utilities.formatDate(new Date(), 'JST', 'yyyy/MM/dd HH:mm');
        const newHistoryEntry = `${timestamp} ${internName}がキャンセル`;
        const updatedHistory = currentHistory
          ? `${currentHistory}\n${newHistoryEntry}`
          : newHistoryEntry;
        sheet.getRange(rowNumber, 8).setValue(updatedHistory);

        return 'シフト申請をキャンセルしました。';
      }
    }
    throw new Error('指定されたシフトが見つかりません。');
  } catch (e) {
    Logger.log(e);
    throw new Error('シフトのキャンセルに失敗しました: ' + e.message);
  }
}

// ----------------------------------------
// サーバーサイド関数 (日報編集) - NEW
// ----------------------------------------
function updateDailyReport(reportId, formData, userName) {
  try {
    if (!reportId || !formData) {
      throw new Error('更新用のデータが不足しています。');
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_DAILY_REPORT);
    if (!sheet) {
      throw new Error(`シート名「${SHEET_DAILY_REPORT}」が見つかりません。`);
    }

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      // H列: 日報ID
      if (data[i][7] === reportId) {
        const rowNumber = i + 1;
        const internName = data[i][0]; // A列: インターン生名

        // 本人じゃないと編集できない
        if (internName !== userName) {
          throw new Error('自分の日報のみ編集できます。');
        }

        // データを更新
        sheet.getRange(rowNumber, 3).setValue(parseInt(formData.satisfaction)); // C: 満足度
        sheet.getRange(rowNumber, 4).setValue(formData.workContent); // D: 業務内容
        sheet.getRange(rowNumber, 5).setValue(formData.impression); // E: 所感・学び

        return '日報を更新しました。';
      }
    }

    throw new Error('更新対象の日報が見つかりませんでした。');
  } catch (e) {
    Logger.log(e);
    throw new Error('日報の更新に失敗しました: ' + e.message);
  }
}

// ----------------------------------------
// サーバーサイド関数 (リマインド通知)
// ----------------------------------------
function sendShiftReminderIfNeeded() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const settingsSheet = ss.getSheetByName(SHEET_SETTINGS);
    if (!settingsSheet) {
      Logger.log('設定シートが見つかりません: ' + SHEET_SETTINGS);
      return;
    }

    const deadlineValue = settingsSheet.getRange(REMINDER_DEADLINE_CELL).getValue();
    if (!deadlineValue || !(deadlineValue instanceof Date)) {
      Logger.log('締切日が設定されていません。セル: ' + REMINDER_DEADLINE_CELL);
      return;
    }

    const today = new Date();
    const deadlineDate = new Date(deadlineValue);
    const diffMs = deadlineDate.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (![15, 7, 3].includes(diffDays)) {
      return;
    }

    const userSheet = ss.getSheetByName(SHEET_USER);
    const internEmails = getEmailsByRoles(['インターン生'], userSheet);
    if (internEmails.length === 0) {
      Logger.log('インターン生のメールが取得できません。');
      return;
    }

    const subject = '【シフト提出リマインド】締切まであと' + diffDays + '日';
    const body =
      'シフト提出の締切が近づいています。\n\n' +
      '締切日: ' +
      Utilities.formatDate(deadlineValue, 'JST', 'yyyy/MM/dd') +
      '\n残日数: ' +
      diffDays +
      '日\n\n' +
      '未提出の方は期日までに提出してください。';

    sendMailSafe({ to: '', bcc: internEmails.join(','), subject: subject, body: body });
  } catch (e) {
    Logger.log('sendShiftReminderIfNeeded Error: ' + e.message);
  }
}

// ----------------------------------------
// 権限付与用（MailApp）
// ----------------------------------------
function authorizeMail() {
  MailApp.sendEmail(
    Session.getActiveUser().getEmail(),
    'MailApp権限確認',
    '権限付与のためのテスト送信です。'
  );
}
