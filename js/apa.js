/* PRO-AX Lab Review — APA 인용 파서
 * 사용자가 APA 양식 참고문헌 한 줄을 붙여 넣으면
 * 제목 / 저자 / 저널명 / 발행연도 / DOI 를 뽑아 자동으로 채웁니다.
 *
 * 예) Sitzmann, T., & Ely, K. (2011). A meta-analysis of self-regulated learning in
 *     work-related training and educational attainment: What we know and where we need
 *     to go. Psychological Bulletin, 137(3), 421-452. https://doi.org/10.1037/a0022777
 *
 * 완벽한 APA 문법 파서가 아니라 '자동 채우기 보조'입니다.
 * 뽑아낸 값은 항상 입력칸에서 사용자가 직접 고칠 수 있습니다.
 */
(function () {
  'use strict';

  var DOI_URL = /(https?:\/\/doi\.org\/[^\s]+)/i;
  var DOI_RAW = /\b(10\.\d{4,9}\/[^\s,;]+)/i;

  function tidy(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parse(raw) {
    var out = { title: '', authors: '', journal: '', doi: '', year: '', notes: [] };
    var text = tidy(raw);
    if (!text) return out;

    /* --- DOI --- */
    var m = text.match(DOI_URL);
    if (m) {
      out.doi = m[1].replace(/[.,;)\]]+$/, '');
    } else {
      var d = text.match(DOI_RAW);
      if (d) out.doi = d[1].replace(/[.,;)\]]+$/, '');
    }

    var work = text
      .replace(DOI_URL, ' ')
      .replace(DOI_RAW, ' ')
      .replace(/https?:\/\/\S+/gi, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[\s,;]+$/, '')
      .trim();

    /* --- 발행연도: 첫 번째 (YYYY) --- */
    var y = work.match(/\((\d{4})[a-z]?\)/);
    if (y) out.year = y[1];

    /* --- 저자: 연도 괄호 앞부분 --- */
    if (y) {
      var at = work.indexOf(y[0]);
      if (at > 0) out.authors = tidy(work.slice(0, at)).replace(/[,\s]+$/, '');
    }
    if (!out.authors) {
      var a = work.match(/^(.+?)\s*\.\s*\(?\d{4}\)?/);
      if (a) out.authors = tidy(a[1]);
    }

    /* --- 남은 부분: 제목. 저널명, 권(호), 쪽수. --- */
    var rest = y ? tidy(work.slice(work.indexOf(y[0]) + y[0].length)) : work;
    rest = rest.replace(/^[.\s]+/, '');

    var full = rest.match(/^(.*?)\.\s+(.+?),\s*(\d+)(?:\s*\(([^)]+)\))?,\s*([^.]*?)\.?$/);
    if (full) {
      out.title = tidy(full[1]);
      out.journal = tidy(full[2]);
    } else {
      var short = rest.match(/^(.*?)\.\s+([^.]+?)[.\s]*$/);
      if (short) {
        out.title = tidy(short[1]);
        out.journal = tidy(short[2]);
      } else {
        out.title = tidy(rest).replace(/\.$/, '');
        out.notes.push('저널명을 찾지 못했습니다. 직접 입력해 주세요.');
      }
    }

    out.title = out.title.replace(/\s*\.$/, '');
    out.journal = out.journal.replace(/^[\s,]+|[\s,.]+$/g, '');

    if (!out.title) out.notes.push('제목을 찾지 못했습니다. 직접 입력해 주세요.');
    if (!out.year) out.notes.push('발행 연도를 찾지 못했습니다(예: (2011)).');
    if (!out.doi) out.notes.push('DOI를 찾지 못했습니다. 없으면 비워 두어도 됩니다.');

    return out;
  }

  window.APA = { parse: parse };
})();
