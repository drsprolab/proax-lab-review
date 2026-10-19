/* PRO-AX Lab Review — 작성 항목 정의
 * 제출 폼(submit.html)과 본문 보기(review.html)가 이 정의를 함께 사용합니다.
 * 필드 name 은 reviews 테이블의 컬럼명과 정확히 일치해야 합니다.
 */
(function () {
  'use strict';

  var F = function (num, name, label, prompt, rows, placeholder) {
    return {
      num: num,
      name: name,
      label: label,
      prompt: prompt,
      rows: rows || 5,
      placeholder: placeholder || ''
    };
  };

  window.REVIEW_ITEMS = [
    F('1', 'r1_reason', '본 논문 선택 근거',
      '이 논문을 이번 주 리뷰 대상으로 고른 이유는 무엇인가?',
      4, '내 연구 주제와의 관련성, 최신성, 이론적·방법론적 중요성 중 무엇 때문인지 적습니다.'),
    F('2', 'r2_problem', '본 논문의 문제의식 및 목적',
      '저자는 무엇을 문제로 삼았고, 그 문제의식이 연구 목적과 연구문제로 어떻게 이어지는가?',
      5, '문제의식 → 목적 → 연구문제의 연결을 정리하고, 목적이 타당하게 설정되었는지 봅니다.'),
    F('3', 'r3_theory', '논문에서 사용한 이론적 근거의 타당성',
      '동원한 이론과 개념이 이 연구문제를 설명하기에 타당한가?',
      5, '개념 정의와 그 이론의 출발점(초기 연구)을 확인했는지, 연구문제를 설명하기에 충분한지 따져 봅니다.'),
    F('4', 'r4_method', '본 논문에서 사용된 방법과, 통계적 이해',
      '어떤 방법과 분석이 쓰였고, 제시된 수치를 어떻게 읽어야 하는가?',
      6, '표집·측정도구·절차와 분석 절차를 정리하고, 계수·적합도·유의확률 등 수치의 의미와 해석 조건을 씁니다.'),
    F('5', 'r5_message', '본 논문의 핵심 메세지',
      '저자가 최종적으로 말하는 바는 한 문장으로 무엇인가?',
      4, '결론이 독자에게 전달하려는 핵심 주장을 한두 문장으로 압축합니다.'),
    F('6', 'r6_critique', '이 논문을 읽고 나의 비판',
      '동의하는 지점과 의문이 남는 지점은 어디인가?',
      6, '논리 전개, 이론 선택, 방법의 한계, 해석의 비약 여부를 근거와 함께 지적합니다.'),
    F('7', 'r7_application', '본 논문을 내 논문에 활용한다면?',
      '어떤 개념·방법·논리를 가져올 수 있고, 무엇을 바꿔야 하는가?',
      5, '내 연구 맥락에 옮겨 쓸 때 그대로 통하는 부분과 수정해야 할 부분을 구분해 적습니다.'),
    F('8', 'r8_learning', '새롭게 배운점 및 나의 생각',
      '이번 리뷰를 통해 새로 알게 된 것과, 그것에 대한 내 생각은?',
      5, '개념·방법·글쓰기에서 얻은 것, 몰랐던 이유, 다음에 더 읽어 볼 문헌을 적습니다.')
  ];

  // 제출 폼·본문 보기 공통 섹션 (한 덩어리)
  window.REVIEW_SECTIONS = [
    {
      id: 'body',
      num: '',
      title: 'Critical Review',
      subtitle: '선택 근거부터 새롭게 배운 점까지 8개 항목',
      fields: window.REVIEW_ITEMS
    }
  ];

  // 모든 rich_text 필드 이름
  window.REVIEW_FIELD_NAMES = window.REVIEW_ITEMS.map(function (f) { return f.name; });

  // 이름 → 정의 조회
  window.REVIEW_FIELD_MAP = (function () {
    var map = {};
    window.REVIEW_ITEMS.forEach(function (f) { map[f.name] = f; });
    return map;
  })();

  window.REVIEW_TOTAL_FIELDS = window.REVIEW_FIELD_NAMES.length;
})();
