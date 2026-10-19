/* PaperLog Seminar — 공용 헬퍼 (다중 테이블 지원)
 * window.PL.table('reviews').list() 형태로 사용합니다.
 * 주차 계산, 포맷, 토스트, 테마도 함께 제공합니다.
 */
(function () {
  'use strict';

  var PAGE_SIZE = 100;
  var TABLE_NAMES = { reviews: 'reviews', students: 'students' };

  // 'local' = 이 브라우저(localStorage)에만 저장하는 미리보기 모드.
  // 구글 연결 전까지 화면 확인용이며, 다른 사람에게는 보이지 않습니다.
  var BACKEND = 'local';

  function ensureOk(res, action) {
    if (!res.ok) throw new Error(action + ' 실패 (' + res.status + ')');
    return res;
  }

  function makeApi(table) {
    var base = 'tables/' + table;

    // 전체 레코드 (페이지네이션 순회)
    function list() {
      var rows = [];
      var total = Infinity;
      var page = 1;

      function step() {
        if (page > 60 || rows.length >= total) return Promise.resolve(rows);
        return fetch(base + '?page=' + page + '&limit=' + PAGE_SIZE)
          .then(function (res) { return ensureOk(res, '목록 불러오기'); })
          .then(function (res) { return res.json(); })
          .then(function (json) {
            var batch = (json && json.data) || [];
            total = json && typeof json.total === 'number' ? json.total : rows.length + batch.length;
            rows = rows.concat(batch);
            if (batch.length < PAGE_SIZE) return rows;
            page += 1;
            return step();
          });
      }
      return step();
    }

    function get(id) {
      return fetch(base + '/' + encodeURIComponent(id))
        .then(function (res) {
          if (res.status === 404) return null;
          return ensureOk(res, '불러오기');
        })
        .then(function (res) { return res ? res.json() : null; });
    }

    function create(data) {
      return fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (res) { return ensureOk(res, '저장'); })
        .then(function (res) { return res.json(); });
    }

    function update(id, data) {
      return fetch(base + '/' + encodeURIComponent(id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (res) { return ensureOk(res, '수정'); })
        .then(function (res) { return res.json(); });
    }

    function remove(id) {
      return fetch(base + '/' + encodeURIComponent(id), { method: 'DELETE' })
        .then(function (res) { return ensureOk(res, '삭제'); });
    }

    return { name: table, list: list, get: get, create: create, update: update, remove: remove };
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
    if (BACKEND === 'local') {
      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function () {
          resolve({ reference: reader.result, original_filename: file.name, content_type: file.type, size: file.size });
        };
        reader.onerror = function () { reject(new Error('이미지를 읽지 못했습니다.')); };
        reader.readAsDataURL(file);
      });
    }

    var headers = {
      'Content-Type': file.type || 'application/octet-stream',
      'X-File-Name': encodeURIComponent(file.name)
    };
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      headers['Idempotency-Key'] = window.crypto.randomUUID();
    }

    return fetch('/files/' + collection, {
      method: 'POST',
      headers: headers,
      body: file
    }).then(function (res) {
      if (res.status === 413) throw new Error('파일이 너무 큽니다. 더 작은 이미지를 올려 주세요.');
      if (res.status === 401) throw new Error('로그인이 필요합니다. 로그인 후 다시 시도해 주세요.');
      if (res.status === 404 || res.status === 503) {
        throw new Error('지금은 파일 업로드를 사용할 수 없습니다. (배포 후 사용 가능)');
      }
      if (!res.ok) throw new Error('도식 업로드에 실패했습니다 (' + res.status + ')');
      return res.json();
    }).then(function (json) {
      if (!json || !json.reference) throw new Error('업로드 응답에 파일 참조가 없습니다.');
      return json;
    });
  }

  // 업로드 응답의 reference 를 그대로 쓰고, id 만 온 경우에만 경로를 보정합니다.
  function fileUrl(collection, ref) {
    var s = String(ref || '').trim();
    if (!s) return '';
    if (s.charAt(0) === '/' || /^(https?:|data:)/i.test(s)) return s;
    return '/files/' + collection + '/' + encodeURIComponent(s);
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

  // opts: { eyebrow: [..], title, lede, tags: [..], meta: [..] }
  function rptHead(opts) {
    var tags = (opts.tags || []).filter(Boolean);
    return '<header class="rpt-head">' +
      '<p class="rpt-eyebrow">' + (opts.eyebrow || []).filter(Boolean).map(esc).join(' · ') + '</p>' +
      '<h1 class="rpt-title">' + esc(opts.title) + '</h1>' +
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

  /* ---------- 제출 완료 → PDF 저장 ---------- */

  // 확인 문서 화면을 '제출 완료' 상태로 바꾸고 PDF 저장 버튼을 엽니다.
  // PDF 는 브라우저 인쇄의 'PDF로 저장'을 사용합니다(@media print 가 문서만 남김).
  function showSubmitted(opts) {
    document.querySelectorAll('#confirmView .doc-toolbar, #confirmView .actionbar').forEach(function (node) {
      node.hidden = true;
    });
    var bar = document.getElementById('doneBar');
    if (!bar) return;
    bar.hidden = false;
    document.getElementById('doneView').href = opts.viewUrl;
    document.getElementById('pdfBtn').addEventListener('click', function () {
      var prev = document.title;
      var theme = document.documentElement.getAttribute('data-theme');
      document.title = opts.fileName; // 저장 대화상자의 기본 파일 이름
      document.documentElement.setAttribute('data-theme', 'light'); // 다크 모드 글자색이 흰 종이에 안 보이지 않게
      window.print();
      document.title = prev;
      document.documentElement.setAttribute('data-theme', theme);
    });
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
    readMinutes: readMinutes,
    rptHead: rptHead,
    rptSection: rptSection,
    rptBody: rptBody,
    doiUrl: doiUrl,
    isLocal: BACKEND === 'local',
    esc: esc,
    toLines: toLines,
    snippet: snippet,
    fmtDate: fmtDate,
    fmtDateTime: fmtDateTime,
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
})();
