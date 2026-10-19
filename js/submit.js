/* PRO-AX Lab Review — 논문 리뷰 제출
 * 흐름: ① 기본 정보(이름·주차·제출일) → ② APA 인용 붙여 넣어 서지 자동 입력
 *       → ③ 8개 항목 직접 타이핑 → [확인하기] 문서형 1장 → [제출하기] 저장
 * 같은 사람이 같은 주차에 다시 제출하면 기존 기록을 갱신합니다.
 */
(function () {
  'use strict';

  var PL = window.PL;
  var APA = window.APA;
  var MD = window.MD;
  var ITEMS = window.REVIEW_ITEMS;
  var FIELD_NAMES = window.REVIEW_FIELD_NAMES;
  var DRAFT_KEY = 'proax-review-draft-v1';

  var state = {
    reviews: [],
    week: PL.weekKey(),
    dirty: false,
    step: 'form' // 'form' | 'confirm'
  };

  var els = {
    formView: document.getElementById('formView'),
    confirmView: document.getElementById('confirmView'),
    sheet: document.getElementById('sheet'),
    sheetSummary: document.getElementById('sheetSummary'),
    composer: document.getElementById('composer'),
    apaNote: document.getElementById('apaNote'),
    fillCount: document.getElementById('fillCount'),
    saveState: document.getElementById('saveState'),
    draftBtn: document.getElementById('draftBtn'),
    confirmBtn: document.getElementById('confirmBtn')
  };

  // 입력칸 id → 저장 컬럼
  var META = {
    'f-student': 'student',
    'f-title': 'paper_title',
    'f-authors': 'paper_authors',
    'f-journal': 'journal_name',
    'f-doi': 'doi',
    'f-year': 'pub_year'
  };

  function el(id) { return document.getElementById(id); }
  function val(id) { return (el(id) && el(id).value || '').trim(); }
  function ta(name) { return document.getElementById('ta-' + name); }

  /* ---------- 1. 주차 ---------- */

  function renderWeeks() {
    var keys = PL.lastNWeeks(10, true).reverse();
    if (keys.indexOf(state.week) === -1) keys.unshift(state.week);
    el('f-week').innerHTML = keys.map(function (k) {
      return '<option value="' + PL.esc(k) + '"' + (k === state.week ? ' selected' : '') + '>' +
        PL.esc(PL.weekLabel(k)) + '</option>';
    }).join('');
  }

  /* ---------- 2. 8개 항목 (타이핑 전용) ---------- */

  function renderComposer() {
    els.composer.innerHTML =
      '<section class="csec" id="step-body" aria-labelledby="bodyTitle">' +
        '<div class="csec-head">' +
          '<span class="csec-num">03</span>' +
          '<h2 id="bodyTitle">Critical Review</h2>' +
          '<span class="csec-sub">1번부터 8번까지 직접 타이핑합니다. 붙여넣기는 지원하지 않습니다.</span>' +
        '</div>' +
        '<div class="csec-body">' +
          ITEMS.map(function (f) {
            return '<div class="f-field">' +
              '<span class="f-label"><span class="f-num">' + f.num + '.</span> ' + PL.esc(f.label) + '</span>' +
              '<p class="f-prompt">' + PL.esc(f.prompt) + '</p>' +
              '<textarea id="ta-' + f.name + '" rows="' + f.rows + '" data-typing-only ' +
                'placeholder="' + PL.esc(f.placeholder) + '" ' +
                'aria-label="' + PL.esc(f.num + '. ' + f.label) + '"></textarea>' +
              '<div class="f-bar">' +
                '<span class="f-hint">직접 타이핑 전용</span>' +
                '<span class="f-count" data-count="' + f.name + '">0자</span>' +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</section>';

    if (window.TYPING) window.TYPING.applyAll();
  }

  /* ---------- 3. 수집 ---------- */

  function collect() {
    var yearRaw = val('f-year');
    var data = {
      student: val('f-student'),
      week_key: el('f-week').value || state.week,
      submitted_at: val('f-date') || PL.today(),
      apa_citation: val('f-apa'),
      paper_title: val('f-title'),
      paper_authors: val('f-authors'),
      journal_name: val('f-journal'),
      doi: val('f-doi'),
      pub_year: yearRaw ? Number(yearRaw) : ''
    };
    FIELD_NAMES.forEach(function (n) {
      var node = ta(n);
      data[n] = node ? node.value.trim() : '';
    });
    return data;
  }

  function apply(data) {
    if (!data) return;
    Object.keys(META).forEach(function (id) {
      var node = el(id);
      if (!node) return;
      var v = data[META[id]];
      node.value = (v === null || v === undefined) ? '' : v;
    });
    if (el('f-apa') && data.apa_citation) el('f-apa').value = data.apa_citation;
    FIELD_NAMES.forEach(function (n) {
      var node = ta(n);
      if (node) node.value = data[n] || '';
    });
  }

  /* ---------- 4. APA 자동 입력 ---------- */

  var apaFilled = {};

  function autofillFromApa(force) {
    var raw = val('f-apa');
    if (!raw) {
      if (force) els.apaNote.textContent = 'APA 인용문을 먼저 붙여 넣어 주세요.';
      return;
    }
    var p = APA.parse(raw);
    var map = [
      ['f-title', p.title],
      ['f-authors', p.authors],
      ['f-journal', p.journal],
      ['f-doi', p.doi],
      ['f-year', p.year]
    ];

    map.forEach(function (pair) {
      var node = el(pair[0]);
      if (!node || !pair[1]) return;
      var touched = apaFilled[pair[0]] !== undefined && node.value.trim() !== apaFilled[pair[0]];
      if (force || !node.value.trim() || !touched) {
        node.value = pair[1];
        apaFilled[pair[0]] = pair[1];
      }
    });

    var filled = map.filter(function (x) { return el(x[0]) && el(x[0]).value.trim(); }).length;
    els.apaNote.textContent = '자동 입력 ' + filled + '/5 항목' +
      (p.notes.length ? ' · ' + p.notes.join(' ') : ' · 값을 확인하고 필요하면 직접 고치세요.');
    refresh();
  }

  /* ---------- 6. 작성 개수 ---------- */

  function refreshCount() {
    var filled = 0;
    FIELD_NAMES.forEach(function (n) {
      var node = ta(n);
      var len = node ? node.value.trim().length : 0;
      var cnt = document.querySelector('[data-count="' + n + '"]');
      if (cnt) {
        cnt.textContent = len + '자';
        cnt.style.color = len ? 'var(--ink)' : 'var(--muted)';
      }
      if (len) filled += 1;
    });
    els.fillCount.textContent = filled + ' / ' + FIELD_NAMES.length;
    return filled;
  }

  function findExisting(student, week) {
    var hit = null;
    state.reviews.forEach(function (r) {
      if (r.student === student && r.week_key === week) {
        if (!hit || Number(r.updated_at || 0) > Number(hit.updated_at || 0)) hit = r;
      }
    });
    return hit;
  }

  function refresh() {
    refreshCount();
  }

  /* ---------- 7. 임시 저장 ---------- */

  function saveDraft(silent) {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ meta: collect(), savedAt: Date.now() }));
      els.saveState.textContent = '임시 저장됨 · ' + PL.fmtDateTime(Date.now());
      state.dirty = false;
      if (!silent) PL.toast('이 브라우저에 임시 저장했습니다.', 'ok');
    } catch (e) {
      if (!silent) PL.toast('임시 저장에 실패했습니다.', 'err');
    }
  }

  function readDraft() {
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* 무시 */ }
    els.saveState.textContent = '임시 저장된 내용 없음';
  }

  /* ---------- 8. 확인 문서 (PDF 화면처럼) ---------- */

  function buildSheet() {
    var d = collect();

    var allText = ITEMS.map(function (f) { return d[f.name] || ''; }).join('');
    var written = ITEMS.filter(function (f) { return String(d[f.name] || '').trim(); }).length;
    var link = PL.doiUrl(d.doi);

    var html = PL.rptHead({
      eyebrow: [PL.fmtDate(d.submitted_at), 'Critical Review', PL.weekShort(d.week_key)],
      title: d.paper_title || '(제목 없음)',
      tags: [d.journal_name, d.pub_year ? String(d.pub_year) : ''],
      meta: ['리뷰 ' + (d.student || '—'), written + '/8개 항목', '약 ' + PL.readMinutes(allText) + '분']
    });

    // Executive Summary = 5. 핵심 메세지
    if (String(d.r5_message || '').trim()) {
      html += '<aside class="rpt-summary">' +
        '<p class="rpt-summary-label">Executive Summary · 핵심 메세지</p>' +
        PL.rptBody(d.r5_message) +
      '</aside>';
    }

    html += '<section class="rpt-source">' +
      '<p class="rpt-source-label">REVIEWED PAPER</p>' +
      '<p class="rpt-source-title">' + PL.esc(d.paper_title || '(제목 없음)') + '</p>' +
      '<p class="rpt-cite">' + PL.esc(d.apa_citation || [d.paper_authors, d.pub_year, d.journal_name].filter(Boolean).join(' · ')) +
        (link && d.apa_citation.indexOf(d.doi) === -1 ? ' <a href="' + PL.esc(link) + '" target="_blank" rel="noopener">' + PL.esc(link) + '</a>' : '') +
      '</p>' +
    '</section>';

    html += ITEMS.map(function (f) {
      return PL.rptSection(f.num, f.label, PL.rptBody(d[f.name]));
    }).join('');

    els.sheet.innerHTML = html;

    var missing = ITEMS.filter(function (f) { return !String(d[f.name] || '').trim(); });
    els.sheetSummary.textContent = missing.length
      ? '비어 있는 항목 ' + missing.length + '개: ' + missing.map(function (f) { return f.num + '번'; }).join(', ')
      : '8개 항목이 모두 작성되었습니다.';
  }

  /* ---------- 9. 확인 / 제출 ---------- */

  function goConfirm() {
    var d = collect();
    if (!d.student) {
      PL.toast('이름을 입력해 주세요.', 'err');
      el('f-student').focus();
      return;
    }
    if (!d.paper_title) {
      PL.toast('APA 인용문을 붙여 넣어 제목을 채워 주세요.', 'err');
      el('f-apa').focus();
      return;
    }

    buildSheet();
    state.step = 'confirm';
    document.body.classList.add('is-confirm');
    els.formView.hidden = true;
    els.confirmView.hidden = false;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function goForm() {
    state.step = 'form';
    document.body.classList.remove('is-confirm');
    els.confirmView.hidden = true;
    els.formView.hidden = false;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function submit(silentRepeat) {
    var data = collect();
    var ex = findExisting(data.student, data.week_key);
    var empty = ITEMS.filter(function (f) { return !String(data[f.name] || '').trim(); }).length;

    var msg = ex
      ? PL.weekShort(data.week_key) + '에 이미 제출한 기록이 있습니다. 기존 리뷰를 갱신할까요?'
      : (empty ? '비어 있는 항목이 ' + empty + '개 있습니다. 이대로 제출할까요?' : '이 내용으로 제출할까요?');
    if (!window.confirm(msg)) return;

    [document.getElementById('submitBtn'), document.getElementById('submitBtn2')].forEach(function (b) {
      if (!b) return;
      b.disabled = true;
      b.textContent = '저장 중…';
    });

    var api = PL.table('reviews');
    var req = ex ? api.update(ex.id, data) : api.create(data);

    req
      .then(function (saved) {
        clearDraft();
        state.dirty = false;
        state.step = 'done';
        PL.toast(ex ? '리뷰를 갱신했습니다.' : '리뷰를 제출했습니다.', 'ok');
        PL.showSubmitted({
          viewUrl: 'review.html?id=' + encodeURIComponent(saved.id),
          fileName: 'CriticalReview_' + data.student + '_' + data.week_key
        });
      })
      .catch(function (err) {
        PL.toast(err.message || '제출에 실패했습니다.', 'err');
        [document.getElementById('submitBtn'), document.getElementById('submitBtn2')].forEach(function (b) {
          if (!b) return;
          b.disabled = false;
          b.textContent = '제출하기';
        });
      });
  }

  /* ---------- 10. 이벤트 ---------- */

  function bind() {
    el('f-week').addEventListener('change', function () { state.dirty = true; refresh(); });
    Object.keys(META).forEach(function (id) {
      var node = el(id);
      if (node) node.addEventListener('input', function () { state.dirty = true; refresh(); });
    });

    var apaTimer = null;
    el('f-apa').addEventListener('input', function () {
      state.dirty = true;
      clearTimeout(apaTimer);
      apaTimer = setTimeout(function () { autofillFromApa(false); }, 350);
    });
    el('f-apa').addEventListener('paste', function () {
      setTimeout(function () { autofillFromApa(true); }, 30);
    });

    els.composer.addEventListener('input', function () {
      state.dirty = true;
      refreshCount();
    });

    els.draftBtn.addEventListener('click', function () { saveDraft(false); });
    els.confirmBtn.addEventListener('click', goConfirm);
    document.getElementById('backBtn').addEventListener('click', goForm);
    document.getElementById('backBtn2').addEventListener('click', goForm);
    document.getElementById('submitBtn').addEventListener('click', submit);
    document.getElementById('submitBtn2').addEventListener('click', submit);

    setInterval(function () {
      if (state.dirty && state.step === 'form') saveDraft(true);
    }, 15000);

    window.addEventListener('beforeunload', function (ev) {
      if (state.dirty && state.step === 'form') {
        saveDraft(true);
        ev.preventDefault();
        ev.returnValue = '';
      }
    });
  }

  /* ---------- 11. 시작 ---------- */

  function boot() {
    var params = new URLSearchParams(window.location.search);
    var wantId = params.get('id') || '';

    renderWeeks();
    renderComposer();
    el('f-date').value = PL.today();
    bind();
    if (window.TYPING) window.TYPING.applyAll();

    PL.table('reviews').list()
      .then(function (rows) {
        state.reviews = rows || [];

        if (wantId) {
          var hit = state.reviews.filter(function (r) { return r.id === wantId; })[0];
          if (hit) {
            if (hit.week_key) {
              state.week = hit.week_key;
              renderWeeks();
              el('f-week').value = hit.week_key;
            }
            apply(hit);
            PL.toast('기존 제출본을 불러왔습니다.', 'ok');
          }
        } else {
          var draft = readDraft();
          if (draft && draft.meta && Object.keys(draft.meta).length) {
            apply(draft.meta);
            if (draft.meta.week_key) {
              state.week = draft.meta.week_key;
              renderWeeks();
              el('f-week').value = draft.meta.week_key;
            }
            els.saveState.textContent = '임시 저장본 복원 · ' + PL.fmtDateTime(draft.savedAt);
            PL.toast('작성 중이던 내용을 복원했습니다.', 'ok');
          }
        }
        refresh();
      })
      .catch(function (err) {
        PL.toast('데이터를 불러오지 못했습니다: ' + (err.message || ''), 'err');
        refresh();
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
