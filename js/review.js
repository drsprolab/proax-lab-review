/* PRO-AX Lab Review — 본문 보기 페이지
 * ?id=<recordId> 로 제출된 리뷰를 읽기 전용으로 렌더링합니다.
 * 모든 방문자가 같은 내용을 볼 수 있습니다.
 */
(function () {
  'use strict';

  var PL = window.PL;
  var MD = window.MD;
  var ITEMS = window.REVIEW_ITEMS;
  var KW = window.REVIEW_KEYWORDS;

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

  function normalizeUrl(value) {
    var s = String(value || '').trim();
    if (!s) return '';
    if (/^https?:\/\//i.test(s)) return s;
    if (/^10\./.test(s)) return 'https://doi.org/' + s;
    return 'https://' + s;
  }

  function emptyState(title, message) {
    return '<a class="daily-back" href="index.html">← 논문 리뷰 목록</a>' +
      '<div class="empty"><strong>' + PL.esc(title) + '</strong>' + message + ' ' +
      '<a href="index.html">목록으로 돌아가기</a></div>';
  }

  function render() {
    if (!row) {
      els.detail.innerHTML = emptyState('리뷰를 찾을 수 없습니다', '주소의 <code>?id</code> 값을 확인해 주세요.');
      return;
    }

    document.title = (row.paper_title || '논문 리뷰') + ' · PRO-AX Lab Review';

    var html = '<article class="page">';
    html += '<a class="daily-back" href="index.html">← 논문 리뷰 목록</a>';

    /* 헤더 */
    html += '<header class="page-head">';
    html += '<div class="eyebrow">' +
      '<time datetime="' + PL.esc(row.submitted_at || '') + '">' + PL.esc(PL.fmtDate(row.submitted_at)) + '</time> · ' +
      PL.esc(PL.weekShort(row.week_key)) + ' · PAPER REVIEW</div>';
    html += '<div class="entry-by" style="gap:9px">' + avatar(row.student || '') +
      '<span style="font-size:15px;font-weight:600">' + PL.esc(row.student || '(제출자 없음)') + '</span>' +
    '</div>';
    html += '<h1>' + PL.esc(row.paper_title || '(제목 없음)') + '</h1>';
    if (row.apa_citation) {
      html += '<p class="apa-line">' + PL.esc(row.apa_citation) + '</p>';
    } else if (row.paper_authors) {
      html += '<p class="apa-line">' + PL.esc(row.paper_authors) + '</p>';
    }
    html += '<div class="page-head-meta">';
    if (row.journal_name) html += '<span>' + PL.esc(row.journal_name) + '</span>';
    if (row.pub_year) html += '<span>' + PL.esc(row.pub_year) + '</span>';
    html += '</div>';
    // 원문: 무료 PDF가 있으면 PDF 버튼(아래 findPdf), 항상 Google Scholar 검색
    var scholar = PL.scholarUrl(row.paper_title, row.doi);
    if (scholar) {
      html += '<div class="entry-top" id="srcLinks" style="margin-top:2px">' +
        '<a class="chip chip-week" href="' + PL.esc(scholar) + '" target="_blank" rel="noopener">Google Scholar에서 원문 찾기 ↗</a>' +
      '</div>';
    }
    html += '</header>';

    /* 0. 핵심 키워드 */
    var words = KW.names.map(function (n) { return row[n]; }).filter(function (w) { return String(w || '').trim(); });
    if (words.length) {
      html += '<div class="kw-row"><span class="kw-label">핵심 키워드</span>' + PL.rptKeywords(words) + '</div>';
    }

    /* 8개 항목 */
    html += '<ol class="body-items">' + ITEMS.map(function (f) {
      var body = MD.render(row[f.name]);
      return '<li class="body-item" id="item-' + f.num + '">' +
        '<div class="body-item-head">' +
          '<span class="body-num">' + f.num + '</span>' +
          '<h2>' + PL.esc(f.label) + '</h2>' +
        '</div>' +
        '<div class="qa-a">' + (body || '<p class="qa-empty">작성되지 않았습니다.</p>') + '</div>' +
      '</li>';
    }).join('') + '</ol>';

    /* 서지 정보 */
    html += '<section class="dsection">' +
      '<div class="dsection-head"><span class="dsection-num">BIBLIO</span><h2>서지 정보</h2></div>' +
      '<dl class="metagrid">' +
        '<div><dt>제출자</dt><dd>' + PL.esc(row.student || '–') + '</dd></div>' +
        '<div><dt>주차</dt><dd>' + PL.esc(PL.weekLabel(row.week_key)) + '</dd></div>' +
        '<div><dt>제출일</dt><dd>' + PL.esc(PL.fmtDate(row.submitted_at) || '–') + '</dd></div>' +
        '<div><dt>저자</dt><dd>' + PL.esc(row.paper_authors || '–') + '</dd></div>' +
        '<div><dt>저널</dt><dd>' + PL.esc(row.journal_name || '–') + '</dd></div>' +
        '<div><dt>발행 연도</dt><dd>' + PL.esc(row.pub_year || '–') + '</dd></div>' +
        '<div><dt>DOI / 링크</dt><dd>' + (row.doi
          ? '<a href="' + PL.esc(normalizeUrl(row.doi)) + '" target="_blank" rel="noopener">' + PL.esc(PL.snippet(row.doi, 60)) + '</a>'
          : '–') + '</dd></div>' +
      '</dl>' +
    '</section>';

    html += nav();
    html += '</article>';

    els.detail.innerHTML = html;
    findPdf();
  }

  var pdfUrl = null; // null = 아직 조회 전

  function findPdf() {
    var box = document.getElementById('srcLinks');
    if (!box || !row.doi) return;
    var show = function (url) {
      if (!url || box.querySelector('[data-pdf]')) return;
      box.insertAdjacentHTML('afterbegin', '<a class="chip chip-week" data-pdf href="' + PL.esc(url) +
        '" target="_blank" rel="noopener">원문 PDF 받기 ↗</a>');
    };
    if (pdfUrl !== null) return show(pdfUrl);
    PL.openPdfUrl(row.doi).then(function (url) { pdfUrl = url; show(url); });
  }

  /* 이전/다음: 같은 주차 순서 기준 */
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
      var t = PL.snippet(r.paper_title || '(제목 없음)', 28);
      return '<a href="review.html?id=' + encodeURIComponent(r.id) + '">' +
        (dir === 'prev' ? '← ' + PL.esc(t) : PL.esc(t) + ' →') + '</a>';
    }

    return '<nav class="post-nav" aria-label="다른 리뷰">' +
      '<span>' + (prev ? link(prev, 'prev') : '<a href="index.html">← 목록 보기</a>') + '</span>' +
      '<span>' + (next ? link(next, 'next') : '<a href="index.html">목록 보기 →</a>') + '</span>' +
    '</nav>';
  }

  function boot() {
    var id = currentId();
    if (!id) {
      els.detail.innerHTML = emptyState('리뷰를 찾을 수 없습니다', '주소에 <code>?id</code> 값이 필요합니다.');
      return;
    }

    els.detail.innerHTML = '<div class="skeleton" style="height:280px"></div>';

    PL.table('reviews').get(id)
      .then(function (record) {
        row = record;
        render();
        return PL.table('reviews').list();
      })
      .then(function (rows) {
        all = rows || [];
        if (row) render();
      })
      .catch(function (err) {
        row = null;
        els.detail.innerHTML = emptyState('리뷰를 불러오지 못했습니다', PL.esc(err.message || '네트워크 오류'));
        PL.toast('리뷰를 불러오지 못했습니다.', 'err');
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
