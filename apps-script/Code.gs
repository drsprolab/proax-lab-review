/**
 * PRO-AX Lab Review — 구글 시트 저장소 (Google Apps Script 웹앱)
 *
 * 이 파일 전체를 구글 시트의 [확장 프로그램 → Apps Script] 편집기에 붙여 넣고
 * [배포 → 새 배포 → 웹 앱]으로 배포합니다. (실행: 나 / 액세스: 모든 사용자)
 *
 * - 제출물은 이 시트의 탭(reviews, concept_maps)에 한 줄씩 저장됩니다. 탭과 열은 자동으로 만들어집니다.
 * - Concept map 도식 이미지는 내 드라이브의 'PRO-AX Lab Review 도식' 폴더에 저장되고,
 *   "링크가 있는 모든 사용자 보기"로 공유되어 사이트에 표시됩니다.
 */

var TABLES = ['reviews', 'concept_maps'];
var FOLDER_NAME = 'PRO-AX Lab Review 도식';
var MAX_UPLOAD = 10 * 1024 * 1024; // 10MB
var BASE_COLUMNS = ['id', 'created_at', 'updated_at'];

/* ---------- 요청 받기 ---------- */

function doGet(e) {
  return respond(e && e.parameter ? e.parameter : {});
}

function doPost(e) {
  var body = {};
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json({ ok: false, error: '요청 형식이 올바르지 않습니다.' });
  }
  return respond(body);
}

function respond(req) {
  try {
    return json({ ok: true, data: route(req) });
  } catch (err) {
    return json({ ok: false, error: String((err && err.message) || err) });
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function route(req) {
  if (req.action !== 'ping') checkPassword(req);
  switch (req.action) {
    case 'auth': return 'ok';
    case 'list': return listRows(sheetFor(req.table));
    case 'get': return getRow(sheetFor(req.table), req.id);
    case 'create': return withLock(function () { return createRow(sheetFor(req.table), req.data || {}); });
    case 'update': return withLock(function () {
      var data = req.data || {};
      validateBestUpdate(req.table, req.id, data);
      return updateRow(sheetFor(req.table), req.id, data);
    });
    case 'upload': return uploadImage(req);
    case 'ping': return 'ok';
  }
  throw new Error('알 수 없는 요청입니다: ' + req.action);
}

/* ---------- 비밀번호 ----------
 * 비밀번호는 코드가 아니라 [프로젝트 설정 → 스크립트 속성]의 PASSWORD 에 둡니다.
 * PASSWORD 가 없으면 비밀번호 없이 열려 있습니다(설정하는 순간부터 잠김).
 */
function checkPassword(req) {
  var pw = PropertiesService.getScriptProperties().getProperty('PASSWORD');
  if (!pw) return;
  if (String(req.key || '') !== String(pw)) throw new Error('AUTH: 비밀번호가 맞지 않습니다.');
}

// 리뷰와 Concept map은 각각 주차별 BEST 한 편만 지정할 수 있고, 지정한 뒤에는 해제할 수 없습니다.
function validateBestUpdate(table, id, data) {
  if (!Object.prototype.hasOwnProperty.call(data, 'best_of_week')) return;
  var current = getRow(sheetFor(table), id);
  if (!current) throw new Error('수정할 기록을 찾지 못했습니다.');
  var wasBest = current.best_of_week === true || String(current.best_of_week) === 'true';
  var willBeBest = data.best_of_week === true || String(data.best_of_week) === 'true';
  if (wasBest && !willBeBest) throw new Error('BEST of Week 지정은 해제할 수 없습니다.');
  if (!willBeBest || wasBest) return;

  var week = String(current.week_key || '');
  var alreadySelected = listRows(sheetFor(table)).some(function (row) {
    return String(row.id) !== String(id) && String(row.week_key || '') === week &&
      (row.best_of_week === true || String(row.best_of_week) === 'true');
  });
  if (alreadySelected) throw new Error('이번 주 BEST가 이미 지정되어 있습니다.');
}

function withLock(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

/* ---------- 시트 ---------- */

function sheetFor(name) {
  if (TABLES.indexOf(name) === -1) throw new Error('알 수 없는 표입니다: ' + name);
  var book = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = book.getSheetByName(name);
  if (!sheet) {
    sheet = book.insertSheet(name);
    sheet.getRange(1, 1, 1, BASE_COLUMNS.length).setValues([BASE_COLUMNS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function headers(sheet) {
  var cols = sheet.getLastColumn();
  return cols ? sheet.getRange(1, 1, 1, cols).getValues()[0].map(String) : [];
}

// 저장할 값에 없는 열은 머리글 끝에 추가합니다.
function ensureColumns(sheet, keys) {
  var head = headers(sheet);
  var missing = keys.filter(function (k) { return head.indexOf(k) === -1; });
  if (missing.length) {
    sheet.getRange(1, head.length + 1, 1, missing.length).setValues([missing]);
    head = head.concat(missing);
  }
  return head;
}

// 시트 값 → 화면용 값 (날짜로 바뀐 칸은 문자열로 되돌림)
function readCell(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return v;
}

// 화면 값 → 시트 값. 글자는 앞에 ' 를 붙여 그대로 저장(=로 시작해도 수식이 되지 않고, 날짜로 바뀌지 않음)
function writeCell(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  var s = String(v);
  return s === '' ? '' : "'" + s;
}

function toObject(head, values) {
  var row = {};
  head.forEach(function (k, i) { if (k) row[k] = readCell(values[i]); });
  return row;
}

function listRows(sheet) {
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var head = headers(sheet);
  return sheet.getRange(2, 1, last - 1, head.length).getValues()
    .filter(function (values) { return values[0] !== ''; })
    .map(function (values) { return toObject(head, values); });
}

function findIndex(sheet, id) {
  var last = sheet.getLastRow();
  if (!id || last < 2) return -1;
  var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i += 1) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}

function getRow(sheet, id) {
  var at = findIndex(sheet, id);
  if (at === -1) return null;
  var head = headers(sheet);
  return toObject(head, sheet.getRange(at, 1, 1, head.length).getValues()[0]);
}

function createRow(sheet, data) {
  var now = Date.now();
  var row = clean(data);
  row.id = Utilities.getUuid();
  row.created_at = now;
  row.updated_at = now;
  var head = ensureColumns(sheet, Object.keys(row));
  sheet.appendRow(head.map(function (k) { return writeCell(row[k]); }));
  return row;
}

function updateRow(sheet, id, data) {
  var at = findIndex(sheet, id);
  if (at === -1) throw new Error('수정할 기록을 찾지 못했습니다.');
  var current = getRow(sheet, id);
  var row = Object.assign(current, clean(data), { id: current.id, created_at: current.created_at, updated_at: Date.now() });
  var head = ensureColumns(sheet, Object.keys(row));
  sheet.getRange(at, 1, 1, head.length).setValues([head.map(function (k) { return writeCell(row[k]); })]);
  return row;
}

// 화면이 보낸 값 중 시스템 열은 무시하고, 열 이름으로 쓸 수 있는 키만 받습니다.
function clean(data) {
  var out = {};
  Object.keys(data || {}).forEach(function (k) {
    if (BASE_COLUMNS.indexOf(k) !== -1) return;
    if (!/^[a-z][a-z0-9_]{0,40}$/.test(k)) return;
    out[k] = data[k];
  });
  return out;
}

/* ---------- 도식 이미지 ---------- */

function uploadImage(req) {
  var type = String(req.type || '');
  if (!/^image\/(png|jpeg|webp|gif)$/.test(type)) throw new Error('PNG, JPEG, WEBP, GIF 이미지만 올릴 수 있습니다.');
  var bytes = Utilities.base64Decode(String(req.data || ''));
  if (!bytes.length) throw new Error('이미지가 비어 있습니다.');
  if (bytes.length > MAX_UPLOAD) throw new Error('이미지는 10MB 이하만 올릴 수 있습니다.');

  var name = String(req.name || 'concept-map').slice(0, 120);
  var file = folder().createFile(Utilities.newBlob(bytes, type, name));
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) {
    throw new Error('드라이브 공유 설정에 실패했습니다. 링크 공유가 허용된 계정(개인 Gmail 등)에서 배포해 주세요.');
  }
  return { reference: file.getId(), original_filename: name, content_type: type, size: bytes.length };
}

function folder() {
  var it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}

/* ---------- 설치 확인 (편집기에서 한 번 실행) ---------- */

// 편집기에서 setup 을 실행하면 권한을 승인하고 탭·폴더를 미리 만듭니다.
function setup() {
  TABLES.forEach(sheetFor);
  folder();
  Logger.log('준비 완료: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl());
}
