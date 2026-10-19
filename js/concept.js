/* PRO-AX Lab Review — Concept map 제출
 * 흐름: 기본 정보 → ① 이론과 개념(직접 타이핑) → ② 도식 이미지(드래그 앤 드롭 업로드)
 *       → ③ Conceptual Map 설명(직접 타이핑) → [확인하기] 문서형 1장 → [제출하기]
 *
 * 도식은 먼저 /files/concept-maps 로 업로드하고, 성공적으로 돌려받은 reference 만
 * concept_maps 행에 저장합니다. (Base64·data URL 을 DB 에 넣지 않습니다.)
 */
(function () {
  'use strict';

  var PL = window.PL;
  var MD = window.MD;
  var DRAFT_KEY = 'proax-concept-draft-v1';
  var COLLECTION = 'concept-maps';
  var MAX_BYTES = 10 * 1024 * 1024; // 10MiB

  var state = {
    week: PL.weekKey(),
    file: null,
    dirty: false,
    step: 'form',
    uploading: false
  };

  var els = {
    formView: document.getElementById('formView'),
    confirmView: document.getElementById('confirmView'),
    sheet: document.getElementById('sheet'),
    sheetSummary: document.getElementById('sheetSummary'),
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('fileInput'),
    previewWrap: document.getElementById('previewWrap'),
    preview: document.getElementById('preview'),
    fileName: document.getElementById('fileName'),
    removeFile: document.getElementById('removeFile'),
    dzHint: document.getElementById('dzHint'),
    fillCount: document.getElementById('fillCount'),
    saveState: document.getElementById('saveState'),
    draftBtn: document.getElementById('draftBtn'),
    confirmBtn: document.getElementById('confirmBtn')
  };

  function el(id) { return document.getElementById(id); }
  function val(id) { return (el(id) && el(id).value || '').trim(); }

  /* ---------- 주차 ---------- */

  function renderWeeks() {
    var keys = PL.lastNWeeks(10, true).reverse();
    if (keys.indexOf(state.week) === -1) keys.unshift(state.week);
    el('f-week').innerHTML = keys.map(function (k) {
      return '<option value="' + PL.esc(k) + '"' + (k === state.week ? ' selected' : '') + '>' +
        PL.esc(PL.weekLabel(k)) + '</option>';
    }).join('');
  }

  /* ---------- 도식 파일 선택 ---------- */

  function human(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  function setHint(text, isError) {
    els.dzHint.textContent = text;
    els.dzHint.className = 'dz-hint' + (isError ? ' is-err' : '');
  }

  function clearFile() {
    if (state.file && els.preview.src) URL.revokeObjectURL(els.preview.src);
    state.file = null;
    els.preview.removeAttribute('src');
    els.previewWrap.hidden = true;
    els.dropzone.hidden = false;
    els.dropzone.classList.remove('is-filled', 'is-over');
    els.fileInput.value = '';
    setHint('도식은 제출할 때 함께 업로드됩니다.', false);
    refreshCount();
  }

  function acceptFile(file) {
    if (!file) return;

    if (!/^image\//.test(file.type)) {
      setHint('이미지 파일만 올릴 수 있습니다(PNG · JPG · WEBP · GIF).', true);
      PL.toast('이미지 파일만 올릴 수 있습니다.', 'err');
      return;
    }
    if (file.size > MAX_BYTES) {
      setHint('파일이 너무 큽니다(' + human(file.size) + '). 10MB 이하로 올려 주세요.', true);
      PL.toast('파일이 너무 큽니다. 10MB 이하로 올려 주세요.', 'err');
      return;
    }

    state.file = file;
    state.dirty = true;

    if (els.preview.src) URL.revokeObjectURL(els.preview.src);
    els.preview.src = URL.createObjectURL(file);
    els.preview.alt = '업로드한 도식 미리보기 — ' + file.name;
    els.fileName.textContent = file.name + ' · ' + human(file.size);
    els.previewWrap.hidden = false;
    els.dropzone.hidden = true;
    setHint('제출 버튼을 누르면 이 파일이 함께 업로드됩니다.', false);
    refreshCount();
  }

  function bindDropzone() {
    els.dropzone.addEventListener('click', function () { els.fileInput.click(); });
    els.dropzone.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        els.fileInput.click();
      }
    });
    els.fileInput.addEventListener('change', function () {
      acceptFile(els.fileInput.files && els.fileInput.files[0]);
    });

    ['dragenter', 'dragover'].forEach(function (type) {
      els.dropzone.addEventListener(type, function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        els.dropzone.classList.add('is-over');
      });
    });
    ['dragleave', 'dragend'].forEach(function (type) {
      els.dropzone.addEventListener(type, function (ev) {
        ev.preventDefault();
        els.dropzone.classList.remove('is-over');
      });
    });
    els.dropzone.addEventListener('drop', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      els.dropzone.classList.remove('is-over');
      var files = ev.dataTransfer && ev.dataTransfer.files;
      acceptFile(files && files[0]);
    });

    els.removeFile.addEventListener('click', clearFile);

    // 페이지 어디로든 파일을 떨어뜨려도 브라우저가 파일을 열지 않게 합니다.
    ['dragover', 'drop'].forEach(function (type) {
      window.addEventListener(type, function (ev) {
        if (ev.target === els.dropzone || els.dropzone.contains(ev.target)) return;
        ev.preventDefault();
      });
    });
  }

  /* ---------- 작성 개수 ---------- */

  function refreshCount() {
    var filled = 0;
    if (val('ta-cm_theory')) filled += 1;
    if (state.file) filled += 1;
    if (val('ta-cm_explanation')) filled += 1;

    ['cm_theory', 'cm_explanation'].forEach(function (n) {
      var node = el('ta-' + n);
      var len = node ? node.value.trim().length : 0;
      var cnt = document.querySelector('[data-count="' + n + '"]');
      if (cnt) {
        cnt.textContent = len + '자';
        cnt.style.color = len ? 'var(--ink)' : 'var(--muted)';
      }
    });

    var cnt = document.querySelector('[data-count="cm_diagram"]');
    if (cnt) cnt.textContent = state.file ? '1개' : '0개';

    els.fillCount.textContent = filled + ' / 3';
    return filled;
  }

  /* ---------- 임시 저장 (텍스트만) ---------- */

  function collect() {
    return {
      student: val('f-student'),
      week_key: el('f-week').value || state.week,
      submitted_at: val('f-date') || PL.today(),
      cm_theory: val('ta-cm_theory'),
      cm_explanation: val('ta-cm_explanation')
    };
  }

  function saveDraft(silent) {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ meta: collect(), savedAt: Date.now() }));
      els.saveState.textContent = '임시 저장됨 · ' + PL.fmtDateTime(Date.now()) +
        (state.file ? ' (도식 파일은 저장되지 않습니다)' : '');
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

  /* ---------- 확인 문서 ---------- */

  function buildSheet() {
    var d = collect();
    var firstLine = String(d.cm_theory || '').split('\n')[0].trim();

    var html = PL.rptHead({
      eyebrow: [PL.fmtDate(d.submitted_at), 'Concept Map', PL.weekShort(d.week_key)],
      title: firstLine || PL.weekLabel(d.week_key) + ' Concept map',
      tags: [PL.weekLabel(d.week_key)],
      meta: ['작성 ' + (d.student || '—'), '약 ' + PL.readMinutes(d.cm_theory + d.cm_explanation) + '분']
    });

    html += PL.rptSection(1, '중점적으로 보는 이론과 개념', PL.rptBody(d.cm_theory));

    html += PL.rptSection(2, '도식화', state.file
      ? '<figure class="rpt-figure"><img src="' + PL.esc(els.preview.src) + '" alt="Concept map 도식" />' +
        '<figcaption><b>그림 1.</b> ' + PL.esc(d.student || '') + '의 Concept map (' + PL.esc(PL.weekShort(d.week_key)) + ')</figcaption></figure>'
      : '<p class="doc-empty">도식 이미지가 없습니다.</p>');

    html += PL.rptSection(3, 'Conceptual Map 설명', PL.rptBody(d.cm_explanation));

    els.sheet.innerHTML = html;

    var missing = [];
    if (!d.cm_theory) missing.push('1번');
    if (!state.file) missing.push('2번');
    if (!d.cm_explanation) missing.push('3번');
    els.sheetSummary.textContent = missing.length
      ? '비어 있는 항목: ' + missing.join(', ')
      : '3개 항목이 모두 준비되었습니다.';
  }

  function goConfirm() {
    var d = collect();
    if (!d.student) {
      PL.toast('이름을 입력해 주세요.', 'err');
      el('f-student').focus();
      return;
    }
    if (!d.cm_theory) {
      PL.toast('1번 항목(이론과 개념)을 작성해 주세요.', 'err');
      el('ta-cm_theory').focus();
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

  /* ---------- 업로드 ---------- */

  function uploadDiagram(file) {
    return PL.upload(COLLECTION, file);
  }

  /* ---------- 제출 ---------- */

  function setSubmitting(on) {
    state.uploading = on;
    [el('submitBtn'), el('submitBtn2')].forEach(function (b) {
      if (!b) return;
      b.disabled = on;
      b.textContent = on ? '저장 중…' : '제출하기';
    });
  }

  function submit() {
    var d = collect();
    var missing = [];
    if (!d.cm_theory) missing.push('1번');
    if (!d.cm_explanation) missing.push('3번');

    var msg = (missing.length
      ? '비어 있는 항목이 있습니다(' + missing.join(', ') + '). 이대로 제출할까요?'
      : '이 내용으로 제출할까요?');
    if (!window.confirm(msg)) return;

    setSubmitting(true);

    var chain = state.file ? uploadDiagram(state.file) : Promise.resolve(null);

    chain
      .then(function (uploaded) {
        var row = {
          student: d.student,
          week_key: d.week_key,
          submitted_at: d.submitted_at,
          cm_theory: d.cm_theory,
          cm_explanation: d.cm_explanation,
          cm_diagram_ref: uploaded ? uploaded.reference : '',
          cm_diagram_name: uploaded ? (uploaded.original_filename || state.file.name) : '',
          cm_diagram_type: uploaded ? (uploaded.content_type || state.file.type) : '',
          cm_diagram_size: uploaded ? (uploaded.size || state.file.size) : 0
        };
        return PL.table('concept_maps').create(row);
      })
      .then(function (saved) {
        clearDraft();
        state.step = 'done';
        PL.toast('Concept map를 제출했습니다.', 'ok');
        PL.showSubmitted({
          viewUrl: 'concept-detail.html?id=' + encodeURIComponent(saved.id),
          fileName: 'ConceptMap_' + d.student + '_' + d.week_key
        });
      })
      .catch(function (err) {
        PL.toast(err.message || '제출에 실패했습니다.', 'err');
        setSubmitting(false);
      });
  }

  /* ---------- 이벤트 ---------- */

  function bind() {
    el('f-week').addEventListener('change', function () { state.dirty = true; });
    el('f-student').addEventListener('input', function () { state.dirty = true; });
    el('f-date').addEventListener('change', function () { state.dirty = true; });

    ['ta-cm_theory', 'ta-cm_explanation'].forEach(function (id) {
      el(id).addEventListener('input', function () { state.dirty = true; refreshCount(); });
    });

    els.draftBtn.addEventListener('click', function () { saveDraft(false); });
    els.confirmBtn.addEventListener('click', goConfirm);
    el('backBtn').addEventListener('click', goForm);
    el('backBtn2').addEventListener('click', goForm);
    el('submitBtn').addEventListener('click', submit);
    el('submitBtn2').addEventListener('click', submit);

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

  /* ---------- 시작 ---------- */

  function boot() {
    renderWeeks();
    el('f-date').value = PL.today();
    bind();
    bindDropzone();
    if (window.TYPING) window.TYPING.applyAll();

    var draft = readDraft();
    if (draft && draft.meta && draft.meta.student) {
      if (draft.meta.week_key) {
        state.week = draft.meta.week_key;
        renderWeeks();
        el('f-week').value = draft.meta.week_key;
      }
      el('f-student').value = draft.meta.student || '';
      el('ta-cm_theory').value = draft.meta.cm_theory || '';
      el('ta-cm_explanation').value = draft.meta.cm_explanation || '';
      els.saveState.textContent = '임시 저장본 복원 · ' + PL.fmtDateTime(draft.savedAt);
    }

    refreshCount();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
