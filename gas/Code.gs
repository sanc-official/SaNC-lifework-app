/**
 * SaNC Lifework Log — Google Apps Script backend
 *
 * スプレッドシートに「1日1行」でログを保存する簡易API。
 * doGet : 全レコードをJSON配列で返す
 * doPost: 受け取ったレコードを日付キーでupsert（追加 or 上書き）
 *
 * --- セットアップ手順 ---
 * 1. Google スプレッドシートを新規作成
 * 2. 拡張機能 > Apps Script を開き、このファイルの内容を貼り付け
 * 3. デプロイ > 新しいデプロイ > 種類「ウェブアプリ」
 *      - 実行ユーザー: 自分
 *      - アクセスできるユーザー: 全員
 * 4. 発行された「ウェブアプリのURL」(末尾が /exec) をコピー
 * 5. アプリの「同期設定」にそのURLを貼り付けて保存
 */

const SHEET_NAME = "log";

// アプリ側のエントリと同じ並び。先頭行のヘッダーになる。
const FIELDS = [
  "id",
  "date",
  "activityType",
  "distanceKm",
  "durationMin",
  "place",
  "rainyAlternative",
  "steps",
  "wakeTime",
  "sleepTime",
  "weightKg",
  "alcohol",
  "studyTopic",
  "studyMinutes",
  "studiedDetail",
  "blocker",
  "oneLine",
  "updatedAt",
  "deleted",
];

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(FIELDS);
  }
  return sheet;
}

function readAll_() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, FIELDS.length).getValues();
  return values.map((row) => {
    const entry = {};
    FIELDS.forEach((key, i) => {
      let v = row[i];
      if (key === "rainyAlternative" || key === "deleted") {
        entry[key] = v === true || v === "true" || v === "TRUE";
      } else {
        entry[key] = v === null || v === undefined ? "" : String(v);
      }
    });
    return entry;
  });
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify(readAll_()))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const incoming = Array.isArray(body.entries) ? body.entries : [];
    const sheet = getSheet_();
    const lastRow = sheet.getLastRow();
    const existing = lastRow >= 2
      ? sheet.getRange(2, 1, lastRow - 1, FIELDS.length).getValues()
      : [];

    const dateCol = FIELDS.indexOf("date");
    const rowByDate = {};
    existing.forEach((row, i) => {
      rowByDate[row[dateCol]] = i + 2; // シート上の行番号（1始まり + ヘッダー）
    });

    incoming.forEach((entry) => {
      const rowValues = FIELDS.map((key) => {
        const v = entry[key];
        return v === undefined || v === null ? "" : v;
      });
      const targetRow = rowByDate[entry.date];
      if (targetRow) {
        sheet.getRange(targetRow, 1, 1, FIELDS.length).setValues([rowValues]);
      } else {
        sheet.appendRow(rowValues);
        rowByDate[entry.date] = sheet.getLastRow();
      }
    });

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, count: incoming.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
