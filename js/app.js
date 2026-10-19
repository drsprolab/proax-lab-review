/* PRO-AX Lab Review — 대문(보드)
 * 논문 리뷰 카드와 Concept map 카드를 각각 불러와 박스형으로 보여 줍니다.
 * 카드를 누르면 본문 페이지로 이동하며, 누구나 열람할 수 있습니다.
 */
(function () {
  'use strict';

  var PL = window.PL;

  var state = {
    reviews: [],
    maps: [],
    reviewWeek: 'all',
    mapWeek: 'all'
  };

  var els = {
    reviewTabs: document.getElementById('reviewTabs'),
    reviewEntries: document.getElementById('reviewEntries'),
    reviewSub: document.getElementById('reviewSub'),
    mapTabs: document.getElementById('mapTabs'),
    mapEntries: document.getElementById('mapEntries'),
    mapSub: document.getElementById('mapSub')
  };

  function tags(values) {
    return '<div class="tags">' + values.filter(Boolean).map(function (v) {
      return '<span class="badge">' + PL.esc(v) + '</span>';
    }).join('') + '</div>';
  }

  function summaryOf(row) {
    return PL.snippet(row.r5_message || row.r2_problem || row.r1_reason || '', 200);
  }

  function byWeek(list, week) {
    return list
      .filter(function (r) { return week === 'all' || r.week_key === week; })
      .sort(function (a, b) {
        var ka = String(a.week_key || '');
        var kb = String(b.week_key || '');
        if (ka !== kb) return kb.localeCompare(ka);
        return String(a.student || '').localeCompare(String(b.student || ''), 'ko');
      });
  }

  function weekKeys(list) {
    var keys = [];
    list.forEach(function (r) {
      if (r.week_key && keys.indexOf(r.week_key) === -1) keys.push(r.week_key);
    });
    return keys.sort(function (a, b) { return String(b).localeCompare(String(a)); });
  }

  function renderTabs(container, list, current) {
    if (!list.length) {
      container.innerHTML = '';
      container.hidden = true;
      return;
    }
    container.hidden = false;
    var html = '<button class="weektab" type="button" data-week="all" aria-pressed="' +
      (current === 'all' ? 'true' : 'false') + '">전체<small>' + list.length + '</small></button>';

    html += weekKeys(list).map(function (k) {
      var count = list.filter(function (r) { return r.week_key === k; }).length;
      return '<button class="weektab" type="button" data-week="' + PL.esc(k) + '" aria-pressed="' +
        (current === k ? 'true' : 'false') + '">' + PL.esc(PL.weekShort(k)) +
        '<small>' + count + '</small></button>';
    }).join('');

    container.innerHTML = html;
  }

  /* ---------- 논문 리뷰 ---------- */

  function renderReviews() {
    var list = byWeek(state.reviews, state.reviewWeek);
    els.reviewEntries.setAttribute('aria-busy', 'false');
    els.reviewSub.textContent = state.reviewWeek === 'all'
      ? '전체 ' + list.length + '편'
      : PL.weekShort(state.reviewWeek) + ' · ' + list.length + '편';

    if (!list.length) {
      els.reviewEntries.innerHTML = '<div class="empty" style="grid-column:1/-1"><strong>아직 제출된 논문 리뷰가 없습니다</strong>' +
        '첫 리뷰를 제출하면 이곳에 카드로 표시되고, 누구나 클릭해 전체 내용을 읽을 수 있습니다. ' +
        '<a href="submit.html">첫 리뷰 제출하기</a></div>';
      return;
    }

    els.reviewEntries.innerHTML = list.map(function (r) {
      var sum = summaryOf(r);
      return '<a class="inst" href="review.html?id=' + encodeURIComponent(r.id) + '">' +
        tags([PL.weekShort(r.week_key), r.student, r.journal_name, r.pub_year]) +
        '<h3>' + PL.esc(r.paper_title || '(제목 없음)') + '</h3>' +
        (sum ? '<p>' + PL.esc(sum) + '</p>' : '') +
      '</a>';
    }).join('');
  }

  /* ---------- Concept map ---------- */

  function thumb(row) {
    var ref = String(row.cm_diagram_ref || '').trim();
    if (!ref) return '';
    var src = PL.fileUrl('concept-maps', ref);
    return '<img class="cm-thumb" src="' + PL.esc(src) + '" alt="' +
      PL.esc((row.student || '') + ' ' + PL.weekShort(row.week_key) + ' Concept map 도식') + '" loading="lazy" />';
  }

  function renderMaps() {
    var list = byWeek(state.maps, state.mapWeek);
    els.mapEntries.setAttribute('aria-busy', 'false');
    els.mapSub.textContent = state.mapWeek === 'all'
      ? '전체 ' + list.length + '편'
      : PL.weekShort(state.mapWeek) + ' · ' + list.length + '편';

    if (!list.length) {
      els.mapEntries.innerHTML = '<div class="empty" style="grid-column:1/-1"><strong>아직 제출된 Concept map이 없습니다</strong>' +
        '수요일 세미나 자료를 제출하면 이곳에 도식과 함께 표시됩니다. ' +
        '<a href="concept.html">첫 Concept map 제출하기</a></div>';
      return;
    }

    els.mapEntries.innerHTML = list.map(function (m) {
      return '<a class="inst" href="concept-detail.html?id=' + encodeURIComponent(m.id) + '">' +
        tags([PL.weekShort(m.week_key), m.student]) +
        '<h3>' + PL.esc(PL.snippet(m.cm_theory || 'Concept map', 60)) + '</h3>' +
        thumb(m) +
        (m.cm_explanation ? '<p>' + PL.esc(PL.snippet(m.cm_explanation, 200)) + '</p>' : '') +
      '</a>';
    }).join('');
  }

  /* ---------- 이벤트 ---------- */

  function bind() {
    els.reviewTabs.addEventListener('click', function (ev) {
      var btn = ev.target.closest('.weektab');
      if (!btn) return;
      state.reviewWeek = btn.getAttribute('data-week');
      renderTabs(els.reviewTabs, state.reviews, state.reviewWeek);
      renderReviews();
    });

    els.mapTabs.addEventListener('click', function (ev) {
      var btn = ev.target.closest('.weektab');
      if (!btn) return;
      state.mapWeek = btn.getAttribute('data-week');
      renderTabs(els.mapTabs, state.maps, state.mapWeek);
      renderMaps();
    });
  }

  function boot() {
    bind();

    PL.table('reviews').list()
      .then(function (rows) {
        state.reviews = rows || [];
        renderTabs(els.reviewTabs, state.reviews, state.reviewWeek);
        renderReviews();
      })
      .catch(function (err) {
        els.reviewEntries.setAttribute('aria-busy', 'false');
        els.reviewEntries.innerHTML = '<div class="empty" style="grid-column:1/-1"><strong>논문 리뷰를 불러오지 못했습니다</strong>' +
          PL.esc(err.message || '네트워크 오류') + '</div>';
      });

    PL.table('concept_maps').list()
      .then(function (rows) {
        state.maps = rows || [];
        renderTabs(els.mapTabs, state.maps, state.mapWeek);
        renderMaps();
      })
      .catch(function (err) {
        els.mapEntries.setAttribute('aria-busy', 'false');
        els.mapEntries.innerHTML = '<div class="empty" style="grid-column:1/-1"><strong>Concept map를 불러오지 못했습니다</strong>' +
          PL.esc(err.message || '네트워크 오류') + '</div>';
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
