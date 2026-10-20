/* PaperLog Seminar — 공용 헬퍼 (다중 테이블 지원)
 * window.PL.table('reviews').list() 형태로 사용합니다.
 * 주차 계산, 포맷, 토스트, 테마도 함께 제공합니다.
 */
(function () {
  'use strict';

  var TABLE_NAMES = { reviews: 'reviews', students: 'students' };

  // 구글 Apps Script 웹앱 주소 (apps-script/Code.gs 를 배포하고 받은 …/exec 주소).
  // 비어 있으면 'local' = 이 브라우저(localStorage)에만 저장하는 미리보기 모드.
  var GAS_URL = 'https://script.google.com/macros/s/AKfycbx5fCuGE2LXr9yD2HA8ozIWjGhPEv27tq35L97IpZ147RaqXdbiLf48-wE06K9fZsaKjA/exec';
  var BACKEND = GAS_URL ? 'google' : 'local';

  /* ---------- 구글 시트 저장 (Apps Script) ---------- */

  // 응답 형식: { ok: true, data } / { ok: false, error }
  function unwrap(res) {
    if (!res.ok) throw new Error('서버 응답 오류 (' + res.status + ')');
    return res.json().then(function (json) {
      if (!json || !json.ok) throw new Error((json && json.error) || '요청을 처리하지 못했습니다.');
      return json.data;
    });
  }

  function gasGet(params) {
    var q = Object.keys(params).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }).join('&');
    return fetch(GAS_URL + '?' + q).then(unwrap);
  }

  // text/plain 으로 보내야 브라우저가 사전 확인(CORS preflight) 없이 Apps Script 로 보낼 수 있습니다.
  function gasPost(body) {
    return fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    }).then(unwrap);
  }

  function makeApi(table) {
    return {
      name: table,
      list: function () { return gasGet({ action: 'list', table: table }); },
      get: function (id) { return gasGet({ action: 'get', table: table, id: id }); },
      create: function (data) { return gasPost({ action: 'create', table: table, data: data }); },
      update: function (id, data) { return gasPost({ action: 'update', table: table, id: id, data: data }); },
      remove: function () { return Promise.reject(new Error('삭제는 구글 시트에서 직접 해 주세요.')); }
    };
  }

  /* ---------- 미리보기 모드: localStorage 저장 ---------- */

  function makeLocalApi(table) {
    var key = 'proax-local-' + table;

    function read() {
      try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; }
    }

    function write(rows) {
      try {
        localStorage.setItem(key, JSON.stringify(rows));
      } catch (e) {
        throw new Error('브라우저 저장 공간이 부족합니다. 더 작은 이미지를 올려 주세요.');
      }
    }

    function newId() {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
      return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    function list() { return Promise.resolve(read()); }

    function get(id) {
      return Promise.resolve(read().filter(function (r) { return r.id === id; })[0] || null);
    }

    function create(data) {
      return new Promise(function (resolve) {
        var now = Date.now();
        var row = Object.assign({}, data, { id: newId(), created_at: now, updated_at: now });
        var rows = read();
        rows.push(row);
        write(rows);
        resolve(row);
      });
    }

    function update(id, data) {
      return new Promise(function (resolve) {
        var rows = read();
        var hit = null;
        rows = rows.map(function (r) {
          if (r.id !== id) return r;
          hit = Object.assign({}, r, data, { id: id, updated_at: Date.now() });
          return hit;
        });
        if (!hit) throw new Error('수정할 기록을 찾지 못했습니다.');
        write(rows);
        resolve(hit);
      });
    }

    function remove(id) {
      return new Promise(function (resolve) {
        write(read().filter(function (r) { return r.id !== id; }));
        resolve();
      });
    }

    return { name: table, list: list, get: get, create: create, update: update, remove: remove };
  }

  var apis = {};
  function table(name) {
    var key = TABLE_NAMES[name] || name;
    if (!apis[key]) apis[key] = BACKEND === 'local' ? makeLocalApi(key) : makeApi(key);
    return apis[key];
  }

  /* ---------- 파일 업로드 ---------- */

  // 반환값: { reference, original_filename, content_type, size }
  function upload(collection, file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error('이미지를 읽지 못했습니다.')); };
      reader.readAsDataURL(file);
    }).then(function (dataUrl) {
      if (BACKEND === 'local') {
        return { reference: dataUrl, original_filename: file.name, content_type: file.type, size: file.size };
      }
      // 구글 드라이브에 저장 → reference 는 드라이브 파일 id
      return gasPost({
        action: 'upload',
        name: file.name,
        type: file.type,
        data: String(dataUrl).split(',')[1] || ''
      });
    });
  }

  // reference → 이미지 주소. 미리보기 모드는 data: 주소, 구글 연결 후에는 드라이브 파일 id
  function fileUrl(collection, ref) {
    var s = String(ref || '').trim();
    if (!s) return '';
    if (/^(https?:|data:)/i.test(s)) return s;
    return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(s) + '&sz=w2000';
  }

  /* ---------- 보고서형 문서 조각 (확인 화면 = PDF) ---------- */

  function pad2(n) { return ('0' + n).slice(-2); }

  // 한국어 기준 분당 약 500자
  function readMinutes(text) {
    return Math.max(1, Math.round(String(text || '').replace(/\s+/g, '').length / 500));
  }

  function rptBody(markdown, emptyText) {
    var html = markdown && window.MD ? window.MD.render(markdown) : '';
    return '<div class="doc-text">' + (html || '<p class="doc-empty">' + esc(emptyText || '작성되지 않았습니다.') + '</p>') + '</div>';
  }

  // 핵심 키워드 칩 (빈 값은 건너뜀)
  function rptKeywords(words) {
    var list = (words || []).map(function (w) { return String(w || '').trim(); }).filter(Boolean);
    if (!list.length) return '<div class="doc-text"><p class="doc-empty">작성되지 않았습니다.</p></div>';
    return '<div class="kw-chips">' + list.map(function (w) { return '<span>' + esc(w) + '</span>'; }).join('') + '</div>';
  }

  // 논문 원문 찾기: Google Scholar 검색 주소 (제목 기준, 없으면 DOI)
  function scholarUrl(title, doi) {
    var q = String(title || '').trim() ? '"' + String(title).trim() + '"' : String(doi || '').trim();
    return q ? 'https://scholar.google.com/scholar?q=' + encodeURIComponent(q) : '';
  }

  // 무료로 받을 수 있는 원문 PDF 주소 (OpenAlex 조회, 없으면 '')
  function openPdfUrl(doi) {
    var m = String(doi || '').match(/10\.\d{4,}\/[^\s]+/);
    if (!m) return Promise.resolve('');
    return fetch('https://api.openalex.org/works/doi:' + encodeURIComponent(m[0]) + '?select=open_access,best_oa_location')
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (w) {
        if (!w) return '';
        var loc = w.best_oa_location || {};
        return loc.pdf_url || (w.open_access && w.open_access.oa_url) || '';
      })
      .catch(function () { return ''; });
  }

  // opts: { eyebrow: [..], title, who, lede, tags: [..], meta: [..] }
  // who = 제출자 이름 — 화면과 PDF에서 한눈에 보이도록 제목 아래 크게 표시
  function rptHead(opts) {
    var tags = (opts.tags || []).filter(Boolean);
    return '<header class="rpt-head">' +
      '<p class="rpt-eyebrow">' + (opts.eyebrow || []).filter(Boolean).map(esc).join(' · ') + '</p>' +
      '<h1 class="rpt-title">' + esc(opts.title) + '</h1>' +
      (opts.who ? '<p class="rpt-who"><span>제출자</span><strong>' + esc(opts.who) + '</strong></p>' : '') +
      (opts.lede ? '<p class="rpt-lede">' + esc(opts.lede) + '</p>' : '') +
      (tags.length ? '<div class="rpt-tags">' + tags.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div>' : '') +
      '<p class="rpt-meta">' + (opts.meta || []).filter(Boolean).map(esc).join(' · ') + '</p>' +
    '</header>';
  }

  function rptSection(num, title, innerHtml) {
    return '<section class="rpt-sec">' +
      '<h2 class="rpt-h"><span class="rpt-n">' + pad2(num) + '</span> · ' + esc(title) + '</h2>' +
      innerHtml +
    '</section>';
  }

  function doiUrl(doi) {
    var s = String(doi || '').trim();
    if (!s) return '';
    if (/^https?:\/\//i.test(s)) return s;
    if (/^10\.\d{4,}\//.test(s)) return 'https://doi.org/' + s;
    return '';
  }

  /* ---------- 확인 문서 → PDF 저장 ---------- */

  // PDF 는 브라우저 인쇄의 'PDF로 저장'을 사용합니다(@media print 가 문서만 남김).
  function printPdf(fileName) {
    var prev = document.title;
    var theme = document.documentElement.getAttribute('data-theme');
    document.title = fileName; // 저장 대화상자의 기본 파일 이름
    document.documentElement.setAttribute('data-theme', 'light'); // 다크 모드 글자색이 흰 종이에 안 보이지 않게
    window.print();
    document.title = prev;
    document.documentElement.setAttribute('data-theme', theme);
  }

  // 확인 문서 화면을 '제출 완료' 상태로 바꾸고 PDF 저장 버튼을 엽니다.
  function showSubmitted(opts) {
    document.querySelectorAll('#confirmView .doc-toolbar, #confirmView .actionbar').forEach(function (node) {
      node.hidden = true;
    });
    var bar = document.getElementById('doneBar');
    if (!bar) return;
    bar.hidden = false;
    document.getElementById('doneView').href = opts.viewUrl;
    document.getElementById('pdfBtn').addEventListener('click', function () { printPdf(opts.fileName); });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  /* ---------- 포맷 ---------- */

  function esc(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/[&<>"']/g, function (ch) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
      });
  }

  function toLines(value) {
    return String(value === null || value === undefined ? '' : value)
      .split(/\r?\n/)
      .map(function (l) { return l.trim(); })
      .filter(Boolean);
  }

  function snippet(text, len) {
    var s = String(text || '').replace(/\s+/g, ' ').trim();
    if (s.length <= len) return s;
    return s.slice(0, len).trim() + '…';
  }

  function pad(n) { return ('0' + n).slice(-2); }

  function fmtDate(value) {
    if (value === null || value === undefined || value === '') return '';
    if (/^\d{4}-W\d{2}$/.test(String(value))) return String(value);
    var m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[1] + '.' + m[2] + '.' + m[3];
    var d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate());
  }

  function fmtDateTime(ms) {
    var n = Number(ms);
    if (!n) return '';
    var d = new Date(n);
    return d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate()) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  /* ---------- 제출 마감 (한국 시간) ----------
   * 마감은 그 주차(월~일)의 요일·시각으로 정합니다.
   *  - 논문 리뷰: 일요일 22:00 / Concept map: 수요일 22:00 (밤 10시)
   * 제출 시간은 학생이 고르는 제출일이 아니라 서버가 기록한 시각(updated_at → created_at)을 씁니다.
   */
  var DEADLINE = {
    reviews: { afterMonday: 6, hour: 22 },
    concept_maps: { afterMonday: 2, hour: 22 }
  };
  var KST = 9 * 3600000;
  var DOW = ['일', '월', '화', '수', '목', '금', '토'];

  // 마감 시각(ms). 주차 키가 없으면 null
  function deadlineMs(weekKeyValue, kind) {
    var rule = DEADLINE[kind];
    var mon = weekKeyToDate(weekKeyValue);
    if (!rule || !mon) return null;
    return Date.UTC(mon.getFullYear(), mon.getMonth(), mon.getDate() + rule.afterMonday, rule.hour) - KST;
  }

  // 마지막으로 제출(또는 갱신)한 서버 시각(ms)
  function submittedMs(row) {
    var n = Number(row && (row.updated_at || row.created_at));
    return n > 0 ? n : null;
  }

  // 한국 시간 'M.D(요일) HH:MM'
  function fmtKst(ms) {
    if (!ms) return '';
    var d = new Date(ms + KST);
    return (d.getUTCMonth() + 1) + '.' + d.getUTCDate() + '(' + DOW[d.getUTCDay()] + ') ' +
      pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes());
  }

  // 제출 시간 표시. 마감이 지난 뒤 제출했으면 빨간 불이 깜빡입니다.
  function submitTime(row, kind) {
    var at = submittedMs(row);
    if (!at) return '';
    var due = deadlineMs(row.week_key, kind);
    var late = due !== null && at > due;
    var tip = (due ? '마감 ' + fmtKst(due) : '') +
      (row.created_at && Number(row.created_at) !== at ? ' · 처음 제출 ' + fmtKst(Number(row.created_at)) : '');
    return '<span class="sub-time' + (late ? ' is-late' : '') + '"' + (tip ? ' title="' + esc(tip.replace(/^ · /, '')) + '"' : '') + '>' +
      (late ? '<span class="late-dot" aria-hidden="true"></span>' : '') +
      '제출 ' + esc(fmtKst(at)) + (late ? ' · <b>마감 후 제출</b>' : '') +
    '</span>';
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  /* ---------- 주차 (ISO 8601, 월요일 시작) ---------- */

  function isoWeek(date) {
    var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    var dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return { year: d.getUTCFullYear(), week: weekNo };
  }

  function weekKey(date) {
    var i = isoWeek(date || new Date());
    return i.year + '-W' + pad(i.week);
  }

  function weekStart(date) {
    var d = date ? new Date(date) : new Date();
    d.setHours(0, 0, 0, 0);
    var day = d.getDay();
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
    return d;
  }

  function weekEnd(date) {
    var s = weekStart(date);
    s.setDate(s.getDate() + 6);
    return s;
  }

  function weekKeyToDate(key) {
    var m = String(key || '').match(/^(\d{4})-W(\d{2})$/);
    if (!m) return null;
    var year = Number(m[1]);
    var week = Number(m[2]);
    var jan4 = new Date(year, 0, 4);
    var start = weekStart(jan4);
    start.setDate(start.getDate() + (week - 1) * 7);
    return start;
  }

  function md(date) { return pad(date.getMonth() + 1) + '.' + pad(date.getDate()); }

  function weekLabel(key) {
    var s = weekKeyToDate(key);
    if (!s) s = weekStart(key ? new Date(key) : new Date());
    var e = new Date(s); e.setDate(e.getDate() + 6);
    var i = isoWeek(s);
    return i.year + '년 ' + i.week + '주차 · ' + md(s) + '–' + md(e);
  }

  function weekShort(key) {
    var m = String(key || '').match(/^(\d{4})-W(\d{2})$/);
    if (m) return m[1].slice(2) + '년 ' + Number(m[2]) + '주';
    return String(key || '');
  }

  // 최근 n개 주차 키 (최신이 마지막)
  function lastNWeeks(n, includeCurrent) {
    var keys = [];
    var base = new Date();
    if (includeCurrent === false) base.setDate(base.getDate() - 7);
    for (var i = n - 1; i >= 0; i -= 1) {
      var d = new Date(base);
      d.setDate(d.getDate() - i * 7);
      keys.push(weekKey(d));
    }
    return keys;
  }

  /* ---------- 표시 유틸 ---------- */

  function initials(name) {
    var s = String(name || '').trim();
    if (!s) return '?';
    if (/[\uAC00-\uD7A3]/.test(s)) return s.slice(0, 2);
    var parts = s.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return s.slice(0, 2).toUpperCase();
  }

  function hue(text) {
    var h = 0;
    var s = String(text || '');
    for (var i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 360;
    return h;
  }

  function toast(message, kind) {
    var wrap = document.querySelector('.toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toast-wrap';
      document.body.appendChild(wrap);
    }
    var el = document.createElement('div');
    el.className = 'toast' + (kind ? ' toast-' + kind : '');
    el.textContent = message;
    wrap.appendChild(el);
    setTimeout(function () { el.classList.add('is-in'); }, 10);
    setTimeout(function () {
      el.classList.remove('is-in');
      setTimeout(function () { el.remove(); }, 300);
    }, 2800);
  }

  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem('paperlog-theme'); } catch (e) { saved = null; }
    var theme = saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    var btn = document.querySelector('[data-theme-toggle]');
    if (btn) {
      btn.textContent = theme === 'dark' ? '☀️' : '🌙';
      btn.addEventListener('click', function () {
        var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        btn.textContent = next === 'dark' ? '☀️' : '🌙';
        try { localStorage.setItem('paperlog-theme', next); } catch (e) { /* 무시 */ }
        if (window.PL && typeof window.PL.onThemeChange === 'function') window.PL.onThemeChange(next);
      });
    }
  }

  // 'YYYY-MM-DD' 두 날짜 사이 일수
  function daysBetween(fromIso, toIso) {
    var a = new Date(fromIso + 'T00:00:00');
    var b = new Date(toIso + 'T00:00:00');
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
    return Math.round((b - a) / 86400000);
  }

  window.PL = {
    table: table,
    upload: upload,
    fileUrl: fileUrl,
    showSubmitted: showSubmitted,
    printPdf: printPdf,
    readMinutes: readMinutes,
    rptHead: rptHead,
    rptSection: rptSection,
    rptBody: rptBody,
    rptKeywords: rptKeywords,
    scholarUrl: scholarUrl,
    openPdfUrl: openPdfUrl,
    doiUrl: doiUrl,
    isLocal: BACKEND === 'local',
    esc: esc,
    toLines: toLines,
    snippet: snippet,
    fmtDate: fmtDate,
    fmtDateTime: fmtDateTime,
    fmtKst: fmtKst,
    deadlineMs: deadlineMs,
    submittedMs: submittedMs,
    submitTime: submitTime,
    today: today,
    weekKey: weekKey,
    weekLabel: weekLabel,
    weekShort: weekShort,
    weekStart: weekStart,
    weekEnd: weekEnd,
    weekKeyToDate: weekKeyToDate,
    lastNWeeks: lastNWeeks,
    initials: initials,
    hue: hue,
    daysBetween: daysBetween,
    toast: toast,
    initTheme: initTheme,
    onThemeChange: null
  };

  initTheme();

  // 미리보기 모드 안내 띠 — 제출물이 공유되지 않는다는 것을 모든 화면 위에 알립니다.
  if (BACKEND === 'local') {
    var showLocalBanner = function () {
      var header = document.querySelector('.site-header');
      if (!header || document.querySelector('.local-banner')) return;
      header.insertAdjacentHTML('afterend', '<div class="local-banner" role="note"><div class="container">' +
        '<strong>시험 운영 중</strong> 제출한 내용은 이 기기의 브라우저에만 저장되며, 다른 사람에게 보이거나 전달되지 않습니다.' +
      '</div></div>');
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showLocalBanner);
    else showLocalBanner();
  }
})();
