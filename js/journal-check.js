/* PRO-AX Lab Review — 학술지 확인 (APA 입력 시)
 * 1) MDPI · Frontiers 계열 논문은 제출할 수 없습니다.
 *    DOI 접두어(MDPI 10.3390, Frontiers 10.3389), 저널 이름, Crossref의 출판사 정보로 판별합니다.
 * 2) SSCI 등재 학술지가 아니면 제출할 수 없습니다.
 *    data/ssci.json 목록(ISSN · 저널 이름)과 대조합니다. 목록 파일이 없으면 이 검사는 건너뜁니다.
 *
 * JCHECK.check({ journal, doi }) → Promise<{ ok, reason, kind }>
 *   kind: 'publisher'(MDPI·Frontiers) | 'ssci'(미등재) | ''(통과)
 */
(function () {
  'use strict';

  // MDPI 대표 학술지 (이름이 정확히 같을 때만 차단)
  var MDPI_TITLES = [
    'sustainability', 'international journal of environmental research and public health', 'education sciences',
    'behavioral sciences', 'healthcare', 'administrative sciences', 'social sciences', 'societies', 'systems',
    'information', 'applied sciences', 'electronics', 'sensors', 'energies', 'mathematics', 'computers',
    'future internet', 'informatics', 'journal of intelligence', 'psychology international', 'children',
    'nutrients', 'religions', 'languages', 'economies', 'journal of risk and financial management', 'businesses',
    'merits', 'encyclopedia', 'philosophies', 'publications', 'data', 'algorithms', 'big data and cognitive computing',
    'multimodal technologies and interaction', 'european journal of investigation in health psychology and education',
    'journal of theoretical and applied electronic commerce research', 'brain sciences', 'journal of clinical medicine',
    'medicina', 'land', 'buildings', 'logistics', 'tourism and hospitality', 'world', 'youth', 'adolescents',
    'trends in higher education', 'knowledge', 'digital', 'ai', 'journalism and media', 'genealogy', 'humanities',
    'arts', 'histories', 'laws', 'risks', 'jrfm', 'ijerph'
  ];

  var SSCI_URL = 'data/ssci.json';
  var ssci = null;   // { issn: {...}, titles: {...} } 또는 false(목록 없음)
  var cache = {};

  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/&amp;/g, 'and').replace(/&/g, 'and')
      .replace(/^the\s+/, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function cleanIssn(s) {
    var m = String(s || '').toUpperCase().match(/(\d{4})-?(\d{3}[\dX])/);
    return m ? m[1] + '-' + m[2] : '';
  }

  function doiOf(s) {
    var m = String(s || '').match(/10\.\d{4,9}\/[^\s,;]+/);
    return m ? m[0].replace(/[.)]+$/, '') : '';
  }

  function loadSsci() {
    if (ssci !== null) return Promise.resolve(ssci);
    return fetch(SSCI_URL, { cache: 'force-cache' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (!data || !data.journals || !data.journals.length) { ssci = false; return ssci; }
        var issn = {}, titles = {};
        data.journals.forEach(function (j) {
          [j.issn, j.eissn].forEach(function (x) { x = cleanIssn(x); if (x) issn[x] = j.title; });
          if (j.title) titles[norm(j.title)] = j.title;
        });
        ssci = { issn: issn, titles: titles, version: data.version || '' };
        return ssci;
      })
      .catch(function () { ssci = false; return ssci; });
  }

  // Crossref 메타데이터 (출판사, ISSN, 저널 이름). 실패하면 null
  function crossref(doi) {
    if (!doi) return Promise.resolve(null);
    if (cache[doi]) return cache[doi];
    cache[doi] = fetch('https://api.crossref.org/works/' + encodeURIComponent(doi))
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (j) {
        var m = j && j.message;
        if (!m) return null;
        return {
          publisher: m.publisher || '',
          journal: (m['container-title'] || [])[0] || '',
          issn: (m.ISSN || []).map(cleanIssn).filter(Boolean)
        };
      })
      .catch(function () { return null; });
    return cache[doi];
  }

  function publisherBlock(journal, doi, meta) {
    var n = norm(journal);
    var metaJournal = norm(meta && meta.journal);
    var pub = String(meta && meta.publisher || '');
    if (/^10\.3389\//.test(doi) || /^frontiers\b/.test(n) || /^frontiers\b/.test(metaJournal) || /frontiers media/i.test(pub)) {
      return 'Frontiers';
    }
    if (/^10\.3390\//.test(doi) || /\bmdpi\b/i.test(pub) || MDPI_TITLES.indexOf(n) !== -1 ||
        (metaJournal && MDPI_TITLES.indexOf(metaJournal) !== -1 && /^10\.3390\//.test(doi))) {
      return 'MDPI';
    }
    return '';
  }

  function check(input) {
    var journal = String(input && input.journal || '').trim();
    var doi = doiOf(input && input.doi);
    if (!journal && !doi) return Promise.resolve({ ok: true, reason: '', kind: '' });

    var quick = publisherBlock(journal, doi, null);
    if (quick) return Promise.resolve(blocked(quick));

    return Promise.all([crossref(doi), loadSsci()]).then(function (res) {
      var meta = res[0];
      var list = res[1];
      var pub = publisherBlock(journal, doi, meta);
      if (pub) return blocked(pub);

      if (!list) return { ok: true, reason: '', kind: '' }; // SSCI 목록이 아직 없음 → 검사 생략
      var issns = (meta && meta.issn) || [];
      var hit = issns.some(function (x) { return list.issn[x]; }) ||
        !!list.titles[norm(journal)] || !!(meta && list.titles[norm(meta.journal)]);
      if (hit) return { ok: true, reason: '', kind: '' };
      return {
        ok: false,
        kind: 'ssci',
        reason: '‘' + (journal || (meta && meta.journal) || '이 학술지') + '’는 SSCI 등재 학술지 목록에서 찾을 수 없습니다. ' +
          'SSCI 논문만 제출할 수 있습니다. 저널 이름이 정확한지 확인해 주세요.'
      };
    });
  }

  function blocked(kind) {
    return {
      ok: false,
      kind: 'publisher',
      reason: kind + ' 계열 논문은 제출할 수 없습니다. 다른 SSCI 논문을 골라 주세요.'
    };
  }

  window.JCHECK = { check: check, loadSsci: loadSsci };
})();
