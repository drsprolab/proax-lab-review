/* PRO-AX Lab Review — 직접 타이핑 전용 입력
 * 지정한 입력칸에서 붙여넣기·끌어놓기·잘라내기를 막습니다.
 * (복사한 내용을 그대로 옮겨 적는 것을 방지하고, 직접 작성하게 하기 위한 장치입니다.)
 */
(function () {
  'use strict';

  var MESSAGE = '붙여넣기는 사용할 수 없습니다. 직접 타이핑해 주세요.';

  function notify() {
    if (window.PL && typeof window.PL.toast === 'function') {
      window.PL.toast(MESSAGE, 'err');
    }
  }

  function guard(node) {
    if (!node || node.__typingGuard) return;
    node.__typingGuard = true;
    node.setAttribute('autocomplete', 'off');
    node.setAttribute('autocorrect', 'off');
    node.setAttribute('autocapitalize', 'off');
    node.setAttribute('spellcheck', 'false');
    node.setAttribute('data-typing-only', '');

    node.addEventListener('paste', function (ev) {
      ev.preventDefault();
      notify();
    });
    node.addEventListener('drop', function (ev) {
      ev.preventDefault();
      notify();
    });
    node.addEventListener('cut', function (ev) {
      ev.preventDefault();
      notify();
    });
  }

  // 선택자에 해당하는 모든 입력칸을 보호합니다.
  function apply(selector) {
    var nodes = document.querySelectorAll(selector || 'textarea[data-typing-only]');
    Array.prototype.forEach.call(nodes, guard);
  }

  // 나중에 동적으로 만들어진 요소에도 적용
  function applyAll() {
    apply('textarea[data-typing-only], input[data-typing-only]');
  }

  document.addEventListener('paste', function (ev) {
    var t = ev.target;
    if (t && t.getAttribute && t.hasAttribute('data-typing-only')) {
      ev.preventDefault();
      notify();
    }
  }, true);

  window.TYPING = { guard: guard, apply: apply, applyAll: applyAll, MESSAGE: MESSAGE };
})();
