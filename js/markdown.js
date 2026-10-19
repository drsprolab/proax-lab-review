/* PaperLog — 경량 마크다운 렌더러
 * 입력은 항상 HTML 이스케이프한 뒤 변환하므로 스크립트 삽입이 불가능합니다.
 * 지원: ## 소제목, > 인용, - / 1. 목록, **굵게**, *기울임*, `코드`, --- 구분선
 */
(function () {
  'use strict';

  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  // 이스케이프된 텍스트 안에서 인라인 서식만 적용
  function inline(s) {
    return s
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|\s)\*([^*\n]+)\*/g, '$1<em>$2</em>');
  }

  function render(src, options) {
    var opts = options || {};
    var text = String(src === null || src === undefined ? '' : src).replace(/\r\n?/g, '\n').trim();
    if (!text) return '';

    var lines = esc(text).split('\n');
    var out = [];
    var para = [];
    var list = null;      // 'ul' | 'ol'
    var quote = [];

    function flushPara() {
      if (!para.length) return;
      out.push('<p>' + inline(para.join(' ')) + '</p>');
      para = [];
    }
    function flushList() {
      if (!list) return;
      out.push('<' + list + '>' + listBuffer.join('') + '</' + list + '>');
      list = null;
      listBuffer = [];
    }
    function flushQuote() {
      if (!quote.length) return;
      var inner = quote.map(function (q) { return '<p>' + inline(q) + '</p>'; }).join('');
      out.push('<blockquote>' + inner + '</blockquote>');
      quote = [];
    }
    var listBuffer = [];

    lines.forEach(function (raw) {
      var line = raw.trim();

      if (!line) { flushPara(); flushList(); flushQuote(); return; }

      if (/^(---|\*\*\*|___)$/.test(line)) {
        flushPara(); flushList(); flushQuote();
        out.push('<hr />');
        return;
      }

      var heading = line.match(/^(#{1,4})\s+(.*)$/);
      if (heading) {
        flushPara(); flushList(); flushQuote();
        var offset = Number(opts.headingOffset) || 0;
        var level = Math.min(4, Math.max(1, heading[1].length + offset));
        out.push('<h' + level + '>' + inline(heading[2]) + '</h' + level + '>');
        return;
      }

      var quote_line = line.match(/^&gt;\s?(.*)$/);
      if (quote_line) {
        flushPara(); flushList();
        quote.push(quote_line[1]);
        return;
      }

      var ul = line.match(/^[-*•]\s+(.*)$/);
      if (ul) {
        flushPara(); flushQuote();
        if (list !== 'ul') { flushList(); list = 'ul'; }
        listBuffer.push('<li>' + inline(ul[1]) + '</li>');
        return;
      }

      var ol = line.match(/^\d+[.)]\s+(.*)$/);
      if (ol) {
        flushPara(); flushQuote();
        if (list !== 'ol') { flushList(); list = 'ol'; }
        listBuffer.push('<li>' + inline(ol[1]) + '</li>');
        return;
      }

      if (list) { flushList(); }
      if (quote.length) { flushQuote(); }
      para.push(line);
    });

    flushPara(); flushList(); flushQuote();
    return out.join('\n');
  }

  // "01 · 제목" 형태의 섹션 제목 목록 추출 (본문 ## 헤딩 기준)
  function outline(src) {
    return String(src || '')
      .split(/\r?\n/)
      .map(function (l) { return l.trim(); })
      .filter(function (l) { return /^#{2,3}\s+/.test(l); })
      .map(function (l) { return esc(l.replace(/^#{2,3}\s+/, '')); });
  }

  function lines(src) {
    return String(src === null || src === undefined ? '' : src)
      .split(/\r?\n/)
      .map(function (l) { return l.trim(); })
      .filter(Boolean);
  }

  window.MD = { render: render, inline: inline, esc: esc, outline: outline, lines: lines };
})();
