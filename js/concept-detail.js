/* PRO-AX Lab Review — Concept map 본문 보기
 * ?id=<recordId> 로 제출된 개념 지도를 읽기 전용으로 렌더링합니다.
 * 도식은 업로드 시 받은 파일 참조(cm_diagram_ref)를 그대로 사용합니다.
 */
(function () {
  'use strict';

  var PL = window.PL;
  var MD = window.MD;
  var row = null;
  var all = [];
  var els = { detail: document.getElementById('detail') };

  function currentId() {
    return new URLSearchParams(window.location.search).get('id');
  }

  function avatar(name) {
    var h = PL.hue(name);
    return '<span class="avatar" style="background:hsl(' + h + ',32%,92%);color:hsl(' + h + ',42%,34%)" aria-hidden="true">' +
      PL.esc(PL.initials(name)) + '</span>';
  }

  function fileUrl(ref) {
    return PL.fileUrl('concept-maps', ref);
  }

  function emptyState(title, message) {
    return '<a class="daily-back" href="index.html">← 목록으로</a>' +
      '<div class="empty"><strong>' + PL.esc(title) + '</strong>' + message + ' ' +
      '<a href="index.html">목록으로 돌아가기</a></div>';
  }

  function render() {
    if (!row) {
      els.detail.innerHTML = emptyState('Concept map를 찾을 수 없습니다', '주소의 <code>?id</code> 값을 확인해 주세요.');
      return;
    }

    document.title = PL.weekShort(row.week_key) + ' Concept map · PRO-AX Lab Review';

    var html = '<article class="page">';
    html += '<a class="daily-back" href="index.html">← 목록으로</a>';

    html += '<header class="page-head">';
    html += '<div class="eyebrow">' +
      '<time datetime="' + PL.esc(row.submitted_at || '') + '">' + PL.esc(PL.fmtDate(row.submitted_at)) + '</time> · ' +
      PL.esc(PL.weekShort(row.week_key)) + ' · CONCEPT MAP</div>';
    html += '<div class="entry-by" style="gap:9px">' + avatar(row.student || '') +
      '<span style="font-size:15px;font-weight:600">' + PL.esc(row.student || '(제출자 없음)') + '</span></div>';
    html += '<h1>' + PL.esc(PL.weekLabel(row.week_key)) + ' Concept map</h1>';
    html += '</header>';

    /* 1. 이론과 개념 */
    html += '<section class="body-item">' +
      '<div class="body-item-head"><span class="body-num">1</span><h2>중점적으로 보는 이론과 개념</h2></div>' +
      '<div class="qa-a">' + (MD.render(row.cm_theory) || '<p class="qa-empty">작성되지 않았습니다.</p>') + '</div>' +
    '</section>';

    /* 2. 도식화 */
    html += '<section class="body-item">' +
      '<div class="body-item-head"><span class="body-num">2</span><h2>도식화</h2></div>';
    if (row.cm_diagram_ref) {
      html += '<figure class="cm-figure">' +
        '<img id="diagram" src="' + PL.esc(fileUrl(row.cm_diagram_ref)) + '" alt="Concept map 도식 — ' +
          PL.esc(row.student || '') + ' ' + PL.esc(PL.weekShort(row.week_key)) + '" loading="lazy" />' +
        (row.cm_diagram_name ? '<figcaption>' + PL.esc(row.cm_diagram_name) + '</figcaption>' : '') +
      '</figure>' +
      '<p class="dz-hint" id="imgNote" hidden>도식 이미지를 불러오지 못했습니다. 파일이 아직 배포되지 않았을 수 있습니다.</p>';
    } else {
      html += '<p class="qa-empty">도식 이미지가 없습니다.</p>';
    }
    html += '</section>';

    /* 3. 설명 */
    html += '<section class="body-item">' +
      '<div class="body-item-head"><span class="body-num">3</span><h2>Conceptual Map 설명</h2></div>' +
      '<div class="qa-a">' + (MD.render(row.cm_explanation) || '<p class="qa-empty">작성되지 않았습니다.</p>') + '</div>' +
    '</section>';

    /* 정보 */
    html += '<section class="dsection">' +
      '<div class="dsection-head"><span class="dsection-num">INFO</span><h2>제출 정보</h2></div>' +
      '<dl class="metagrid">' +
        '<div><dt>제출자</dt><dd>' + PL.esc(row.student || '–') + '</dd></div>' +
        '<div><dt>주차</dt><dd>' + PL.esc(PL.weekLabel(row.week_key)) + '</dd></div>' +
        '<div><dt>제출일</dt><dd>' + PL.esc(PL.fmtDate(row.submitted_at) || '–') + '</dd></div>' +
        '<div><dt>도식 파일</dt><dd>' + PL.esc(row.cm_diagram_name || '–') + '</dd></div>' +
      '</dl>' +
    '</section>';

    html += nav();
    html += '</article>';

    els.detail.innerHTML = html;

    var img = document.getElementById('diagram');
    if (img) {
      img.addEventListener('error', function () {
        img.hidden = true;
        var note = document.getElementById('imgNote');
        if (note) note.hidden = false;
      });
    }
  }

  function nav() {
    var ordered = all.slice().sort(function (a, b) {
      var ka = String(a.week_key || '');
      var kb = String(b.week_key || '');
      if (ka !== kb) return ka.localeCompare(kb);
      return String(a.student || '').localeCompare(String(b.student || ''), 'ko');
    });
    var i = -1;
    for (var k = 0; k < ordered.length; k += 1) if (ordered[k].id === row.id) { i = k; break; }

    var prev = i > 0 ? ordered[i - 1] : null;
    var next = i >= 0 && i < ordered.length - 1 ? ordered[i + 1] : null;

    function link(r, dir) {
      var t = PL.weekShort(r.week_key) + ' · ' + (r.student || '');
      return '<a href="concept-detail.html?id=' + encodeURIComponent(r.id) + '">' +
        (dir === 'prev' ? '← ' + PL.esc(t) : PL.esc(t) + ' →') + '</a>';
    }

    return '<nav class="post-nav" aria-label="다른 Concept map">' +
      '<span>' + (prev ? link(prev, 'prev') : '<a href="index.html">← 목록으로</a>') + '</span>' +
      '<span>' + (next ? link(next, 'next') : '<a href="index.html">목록으로 →</a>') + '</span>' +
    '</nav>';
  }

  function boot() {
    var id = currentId();
    if (!id) {
      els.detail.innerHTML = emptyState('Concept map를 찾을 수 없습니다', '주소에 <code>?id</code> 값이 필요합니다.');
      return;
    }

    els.detail.innerHTML = '<div class="skeleton" style="height:280px"></div>';

    PL.table('concept_maps').get(id)
      .then(function (record) {
        row = record;
        render();
        return PL.table('concept_maps').list();
      })
      .then(function (rows) {
        all = rows || [];
        if (row) render();
      })
      .catch(function (err) {
        row = null;
        els.detail.innerHTML = emptyState('Concept map를 불러오지 못했습니다', PL.esc(err.message || '네트워크 오류'));
        PL.toast('Concept map를 불러오지 못했습니다.', 'err');
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
