/* PRO-AX Lab Review — 대문(보드)
 * 논문 리뷰 카드와 Concept map 카드를 각각 불러와 박스형으로 보여 줍니다.
 * 카드를 누르면 본문 페이지로 이동하며, 누구나 열람할 수 있습니다.
 * 주차별로 묶고, 마감이 지난 주는 접힌 묶음으로 숨깁니다.
 */
(function () {
  'use strict';

  var PL = window.PL;

  var state = {
    reviews: [],
    maps: []
  };

  var els = {
    reviewEntries: document.getElementById('reviewEntries'),
    reviewSub: document.getElementById('reviewSub'),
    mapEntries: document.getElementById('mapEntries'),
    mapSub: document.getElementById('mapSub')
  };

  function tags(values) {
    var list = values.filter(Boolean);
    if (!list.length) return '';
    return '<div class="tags">' + list.map(function (v) {
      return '<span class="badge">' + PL.esc(v) + '</span>';
    }).join('') + '</div>';
  }

  // 제출자 이름 — 카드 맨 위에 크게
  function who(name) {
    return '<div class="inst-who">' + PL.esc(name || '이름 없음') + '</div>';
  }

  function countLabel(list, kind) {
    var n = list.filter(function (r) { return isSample(r, kind); }).length;
    return '전체 ' + (list.length - n) + '편' + (n ? ' · Sample ' + n + '편' : '');
  }

  function isBest(row) {
    return String(row.best_of_week).toLowerCase() === 'true';
  }

  function bestControl(row, kind) {
    var best = isBest(row);
    return '<label class="best-checkbox" title="Best Review of Week 선정 / 해제">' +
      '<input type="checkbox" data-best-kind="' + kind + '" data-best-id="' + PL.esc(row.id) +
      '" aria-label="' + PL.esc((row.student || '이름 없음') + ' · Best Review of Week') +
      '"' + (best ? ' checked' : '') + ' />' +
      '<span class="best-week-badge"' + (best ? '' : ' hidden') + '>Best Review of Week</span></label>';
  }

  function showBestSelection(input, best) {
    input.checked = best;
    input.parentElement.querySelector('.best-week-badge').hidden = !best;
    input.closest('.review-card-wrap').classList.toggle('is-best', best);
  }

  function summaryOf(row) {
    return PL.snippet(row.r5_message || row.r2_problem || row.r1_reason || '', 200);
  }

  /* ---------- 주차 묶음 ----------
   * 한 주(월~일) 단위로 묶습니다. 마감이 지나면 그 주는 접힌 묶음이 됩니다.
   *  - 논문 리뷰(일요일 제출): 다음 주 화요일 오전 10시
   *  - Concept map(수요일 제출): 그 주 금요일 오전 10시
   */
  var FOLD_AFTER = { reviews: 8, maps: 4 }; // 주 시작(월요일)부터 며칠 뒤
  var FOLD_HOUR = 10;

  function foldAt(key, kind) {
    var d = PL.weekKeyToDate(key);
    if (!d) return null;
    d.setDate(d.getDate() + FOLD_AFTER[kind]);
    d.setHours(FOLD_HOUR, 0, 0, 0);
    return d;
  }

  function weekTitle(key) {
    var m = String(key || '').match(/^(\d{4})-W(\d{2})$/);
    return m ? m[1] + '년 ' + Number(m[2]) + '주차' : (key || '주차 없음');
  }

  function foldNote(d) {
    var days = ['일', '월', '화', '수', '목', '금', '토'];
    return (d.getMonth() + 1) + '.' + d.getDate() + '(' + days[d.getDay()] + ') 오전 ' + FOLD_HOUR + '시에 묶음으로 정리';
  }

  // list → [{ key, rows }] 최신 주차부터, 주 안에서는 이름순
  function groupByWeek(list) {
    var groups = {};
    list.forEach(function (r) {
      var k = r.week_key || '';
      (groups[k] = groups[k] || []).push(r);
    });
    return Object.keys(groups)
      .sort(function (a, b) { return b.localeCompare(a); })
      .map(function (k) {
        return {
          key: k,
          rows: groups[k].sort(function (a, b) {
            return String(a.student || '').localeCompare(String(b.student || ''), 'ko');
          })
        };
      });
  }

  /* ---------- Sample 묶음 ----------
   * 작성 예시로 남겨 둔 제출물. 주차 묶음에서 빼고 맨 위의 'Sample' 묶음에 따로 둡니다.
   * 예시를 바꾸려면 구글 시트의 id 를 여기에 넣거나 뺍니다.
   */
  var SAMPLE_IDS = {
    reviews: [
      '9e9db159-8474-48dd-8926-3a0bf2ec68ec', // 김예서 — Making transparency transparent
      'acf4cf36-486f-4393-b0ad-8cb3cb48eaf7', // 김재현 — Transfer of training
      'e243a4d8-d245-4230-9ea9-1af0a5315646', // 오선빈 — Innovation climate profiles
      'd6a4e60c-2528-4b86-a1f1-3134565eeb18'  // 최지수 — A Review of Self-Regulated Learning
    ],
    maps: []
  };

  function isSample(row, kind) {
    return SAMPLE_IDS[kind].indexOf(row.id) !== -1;
  }

  function sampleGroup(rows, gridClass, card) {
    if (!rows.length) return '';
    return '<details class="wk-fold wk-sample">' +
      '<summary class="wk-head">Sample<small>' + rows.length + '편</small>' +
        '<span class="wk-note">작성 예시</span></summary>' +
      '<div class="' + gridClass + '">' + rows.map(card).join('') + '</div>' +
    '</details>';
  }

  function renderWeeks(container, list, kind, gridClass, card) {
    var now = new Date();
    var samples = list.filter(function (r) { return isSample(r, kind); });
    var rest = list.filter(function (r) { return !isSample(r, kind); });
    container.innerHTML = sampleGroup(samples, gridClass, card) + groupByWeek(rest).map(function (g) {
      var at = foldAt(g.key, kind);
      var cards = '<div class="' + gridClass + '">' + g.rows.map(card).join('') + '</div>';
      var count = '<small>' + g.rows.length + '편</small>';
      if (at && now < at) {
        return '<section class="wk-open">' +
          '<h3 class="wk-head">' + PL.esc(weekTitle(g.key)) + count +
            '<span class="wk-note">' + PL.esc(foldNote(at)) + '</span></h3>' +
          cards +
        '</section>';
      }
      return '<details class="wk-fold">' +
        '<summary class="wk-head">' + PL.esc(weekTitle(g.key)) + count + '</summary>' +
        cards +
      '</details>';
    }).join('');
  }

  /* ---------- 논문 리뷰 ---------- */

  function renderReviews() {
    var list = state.reviews;
    els.reviewEntries.setAttribute('aria-busy', 'false');
    els.reviewSub.textContent = countLabel(list, 'reviews');

    if (!list.length) {
      els.reviewEntries.innerHTML = '<div class="empty"><strong>아직 제출된 논문 리뷰가 없습니다</strong>' +
        '첫 리뷰를 제출하면 이곳에 카드로 표시되고, 누구나 클릭해 전체 내용을 읽을 수 있습니다. ' +
        '<a href="submit.html">첫 리뷰 제출하기</a></div>';
      return;
    }

    renderWeeks(els.reviewEntries, list, 'reviews', 'entries', function (r) {
      var sum = summaryOf(r);
      var best = isBest(r);
      return '<div class="review-card-wrap' + (best ? ' is-best' : '') + '"><div class="best-card-head">' +
        who(r.student) + bestControl(r, 'reviews') + '</div><a class="inst" href="review.html?id=' + encodeURIComponent(r.id) + '">' +
        PL.submitTime(r, 'reviews') +
        tags([r.journal_name, r.pub_year]) +
        '<h3 class="review-title">' + PL.esc(r.paper_title || '(제목 없음)') +
          '</h3>' +
        (sum ? '<p>' + PL.esc(sum) + '</p>' : '') +
      '</a></div>';
    });
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
    var list = state.maps;
    els.mapEntries.setAttribute('aria-busy', 'false');
    els.mapSub.textContent = countLabel(list, 'maps');

    if (!list.length) {
      els.mapEntries.innerHTML = '<div class="empty"><strong>아직 제출된 Concept map이 없습니다</strong>' +
        '수요일 세미나 자료를 제출하면 이곳에 도식과 함께 표시됩니다. ' +
        '<a href="concept.html">첫 Concept map 제출하기</a></div>';
      return;
    }

    renderWeeks(els.mapEntries, list, 'maps', 'cm-grid', function (m) {
      var best = isBest(m);
      return '<div class="review-card-wrap' + (best ? ' is-best' : '') + '"><div class="best-card-head">' +
        who(m.student) + bestControl(m, 'maps') + '</div><a class="inst" href="concept-detail.html?id=' + encodeURIComponent(m.id) + '">' +
        PL.submitTime(m, 'concept_maps') +
        '<h3 class="review-title">' + PL.esc(PL.snippet(m.cm_theory || 'Concept map', 60)) +
          '</h3>' +
        thumb(m) +
        (m.cm_explanation ? '<p>' + PL.esc(PL.snippet(m.cm_explanation, 200)) + '</p>' : '') +
      '</a></div>';
    });
  }

  /* ---------- 방금 제출한 글 표시 ----------
   * 제출 화면이 index.html?submitted=<id>&kind=reviews|maps 로 보내면
   * 그 카드가 든 묶음을 펼치고, 카드를 강조해 화면 가운데로 가져옵니다.
   */
  function markSubmitted(kind, container) {
    var params = new URLSearchParams(window.location.search);
    var id = params.get('submitted');
    if (!id || params.get('kind') !== kind) return;

    var card = container.querySelector('a.inst[href$="id=' + encodeURIComponent(id) + '"]');
    if (card) {
      var fold = card.closest('details');
      if (fold) fold.open = true;
      card.classList.add('is-mine');
      card.insertAdjacentHTML('afterbegin', '<span class="mine-flag">방금 제출</span>');
      card.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    PL.toast('제출이 완료되었습니다. 방금 제출한 글을 확인하세요.', 'ok');
    // 새로고침해도 다시 뜨지 않게 주소에서 지웁니다.
    window.history.replaceState(null, '', window.location.pathname);
  }

  /* ---------- 이벤트 ---------- */

  function boot() {
    PL.table('reviews').list()
      .then(function (rows) {
        state.reviews = rows || [];
        renderReviews();
        markSubmitted('reviews', els.reviewEntries);
      })
      .catch(function (err) {
        els.reviewEntries.setAttribute('aria-busy', 'false');
        els.reviewEntries.innerHTML = '<div class="empty"><strong>논문 리뷰를 불러오지 못했습니다</strong>' +
          PL.esc(err.message || '네트워크 오류') + '</div>';
      });

    PL.table('concept_maps').list()
      .then(function (rows) {
        state.maps = rows || [];
        renderMaps();
        markSubmitted('maps', els.mapEntries);
      })
      .catch(function (err) {
        els.mapEntries.setAttribute('aria-busy', 'false');
        els.mapEntries.innerHTML = '<div class="empty"><strong>Concept map를 불러오지 못했습니다</strong>' +
          PL.esc(err.message || '네트워크 오류') + '</div>';
      });
  }

  function attachBestToggle(container, kind) {
    // 기존 제출 시간 옆의 빨간 점으로도 같은 체크박스를 선택할 수 있습니다.
    container.addEventListener('click', function (event) {
      if (!event.target.closest('.late-dot')) return;
      var card = event.target.closest('.review-card-wrap');
      var input = card && card.querySelector('[data-best-id]');
      if (!input) return;
      event.preventDefault();
      if (!input.disabled) input.click();
    });
    container.addEventListener('change', function (event) {
      var input = event.target.closest('[data-best-id]');
      if (!input || !container.contains(input)) return;
      var id = input.getAttribute('data-best-id');
      // 목록 로딩 때 state 배열이 교체되므로 클릭 시점의 최신 목록을 읽습니다.
      var row = state[kind].filter(function (r) { return String(r.id) === String(id); })[0];
      if (!row || input.disabled) return;
      var previous = isBest(row);
      var next = input.checked;
      // 체크 즉시 바로 옆에 배지를 표시하고, 저장 실패 시 원래 상태로 복원합니다.
      showBestSelection(input, next);
      input.disabled = true;
      input.setAttribute('aria-busy', 'true');
      PL.table(kind === 'maps' ? 'concept_maps' : 'reviews').update(id, {
        best_of_week: next,
        submitted_time: row.submitted_time || row.updated_at || row.created_at || null
      }).then(function (updated) {
        if (!updated || !Object.prototype.hasOwnProperty.call(updated, 'best_of_week') || isBest(updated) !== next) {
          throw new Error('저장 결과를 확인하지 못했습니다. 다시 시도해 주세요.');
        }
        Object.assign(row, updated);
      }).catch(function (err) {
        showBestSelection(input, previous);
        PL.toast('BEST 표시를 저장하지 못했습니다: ' + (err.message || '네트워크 오류'), 'error');
      }).then(function () {
        input.disabled = false;
        input.removeAttribute('aria-busy');
      });
    });
  }

  attachBestToggle(els.reviewEntries, 'reviews');
  attachBestToggle(els.mapEntries, 'maps');

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
