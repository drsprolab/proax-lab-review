# PRO-AX Lab Review

PRO AnalytiX Lab 주간 세미나 기록소입니다.
**일요일에는 논문 리뷰(Critical Review)**, **수요일에는 Concept map** — 한 사람이 읽고 정리한 논문이 연구실 전체의 읽기가 됩니다.

- 대문: `index.html` — 제목 **PRO-AX Lab Review**, 요일별 일정 2칸, 논문 리뷰 · Concept map 목록
- 논문 리뷰 제출: `submit.html` — 기본 정보 → APA 자동 서지 → 8항목 작성 → 확인 → 제출
- 논문 리뷰 본문: `review.html?id=<id>` — 누구나 읽을 수 있는 전체 본문
- Concept map 제출: `concept.html` — 기본 정보 → 3항목(이론·도식·설명) → 확인 → 제출
- Concept map 본문: `concept-detail.html?id=<id>`

---

## 1. 화면 흐름

### ① 대문 `index.html`
1. 상단 브랜드 **PRO-AX Lab Review** / `Weekly Seminar`
2. 주간 일정 두 칸 — 각 칸 아래에 `제출 페이지로 이동 →`
   - **일요일 — 논문 리뷰** → `submit.html`
   - **수요일 — Concept map** → `concept.html`
3. **논문 리뷰 목록** — 박스형 카드(주차 칩 · 제목 · 저자/저널/연도 · 요약 3줄 · 제출자 아바타 · `전체 보기`)
   - 카드를 누르면 `review.html?id=…`
   - 상단 주차 탭으로 `전체` / 특정 주차 필터
4. **Concept map 목록** — 도식 썸네일 + 제목 + 설명 3줄 카드
   - 카드를 누르면 `concept-detail.html?id=…`

두 목록은 서로 독립적으로 로드·필터링됩니다(한쪽이 비어도 다른 쪽은 정상 표시).

### ② 논문 리뷰 제출 `submit.html` — 3단계 + 확인
| 단계 | 내용 |
| --- | --- |
| **01 기본 정보** | 이름, 제출 주차(ISO 주차), 제출일(기본값 오늘) |
| **02 논문 서지 (APA)** | APA 인용문을 붙여 넣으면 **제목·저자·저널명·DOI·발행 연도가 자동 입력** |
| **03 Critical Review** | 8개 항목 — **직접 타이핑 전용**(붙여넣기 차단) |
| **확인하기** | 작성 내용이 **인쇄물(PDF)처럼 정돈된 한 편의 문서**로 표시 |
| **제출** | 저장 후 본문 페이지로 이동. 같은 사람이 같은 주차에 다시 내면 **기존 기록 갱신** |

- SSCI 등재 근거 입력란은 **없습니다**(요청에 따라 제거). 확인 체크박스만 유지됩니다.
- APA 자동 입력은 붙여 넣기에서 즉시, 타이핑에서는 350ms 지연 후 실행됩니다.
- 사용자가 직접 고친 칸은 자동 입력이 덮어쓰지 않습니다(붙여 넣기 시에는 갱신).
- 작성 중 내용은 15초마다 `localStorage`(`proax-review-draft-v1`)에 임시 저장됩니다.

### ③ 논문 리뷰 본문 `review.html?id=<recordId>`
- 제목, APA 인용, 제출자, 주차, 제출일, `원문 열기`(DOI 자동 링크)
- 항목 바로가기(TOC) + 8개 항목 본문
- 서지 정보 표, 이전/다음 리뷰 이동

### ④ Concept map 제출 `concept.html`
| 단계 | 내용 |
| --- | --- |
| **01 기본 정보** | 이름, 제출 주차, 제출일 |
| **02 중점적으로 보는 이론과 개념** | 번호 `1.` — **직접 타이핑 전용** |
| **03 도식화** | 번호 `2.` — **외부 이미지 파일을 드래그 & 드롭**해 첨부(클릭해서 파일 선택도 가능) |
| **04 Conceptual Map 설명** | 번호 `3.` — **직접 타이핑 전용** |
| **확인하기** | 3항목 + 도식 미리보기가 PDF형 문서로 표시 |
| **제출** | 파일 업로드 → 행 저장 → `concept-detail.html?id=…`로 이동 |

- 도식 파일: PNG / JPEG / WEBP / GIF, 최대 10MB. 드롭 즉시 미리보기 + 파일명 + `제거` 버튼.
- 도식은 **Base64로 저장하지 않습니다.** `POST /files/concept-maps`로 먼저 업로드하고, 반환된 `reference`와 메타데이터(파일명·MIME·크기)만 `concept_maps` 행에 저장합니다.
- 파일 업로드는 **Hosted Deploy + 플랫폼 활성화 이후에만** 동작합니다. 미리보기(에디터)에서는 404/503 응답을 받아 "지금은 파일 업로드를 사용할 수 없습니다 (배포 후 사용 가능)" 안내가 뜹니다.
- 작성 중 텍스트는 `localStorage`(`proax-concept-draft-v1`)에 임시 저장됩니다(도식 파일은 저장하지 않음 — 다시 첨부 필요).

## 2. 작성 항목

정의는 `js/form-schema.js`(논문 리뷰) 한 곳에만 있고, 제출 폼과 본문 보기가 같은 정의를 공유합니다.
필드명은 `reviews` 테이블 컬럼과 일치합니다.

### 논문 리뷰 — Critical Review 8항목
| # | 항목 | 필드 |
| --- | --- | --- |
| 1 | 본 논문 선택 근거 | `r1_reason` |
| 2 | 본 논문의 문제의식 및 목적 | `r2_problem` |
| 3 | 논문에서 사용한 이론적 근거의 타당성 | `r3_theory` |
| 4 | 본 논문에서 사용된 방법과, 통계적 이해 | `r4_method` |
| 5 | 본 논문의 핵심 메세지 | `r5_message` |
| 6 | 이 논문을 읽고 나의 비판 | `r6_critique` |
| 7 | 본 논문을 내 논문에 활용한다면? | `r7_application` |
| 8 | 새롭게 배운점 및 나의 생각 | `r8_learning` |

### Concept map 3항목
| # | 항목 | 필드 |
| --- | --- | --- |
| 1 | 중점적으로 보는 이론과 개념 | `cm_theory` |
| 2 | 도식화 (이미지 첨부) | `cm_diagram_ref` 외 |
| 3 | Conceptual Map 설명 | `cm_explanation` |

### 직접 타이핑 전용
`js/typing.js`가 `data-typing-only` 속성이 붙은 입력칸에서 `paste` / `drop` / `cut`을 차단하고
"붙여넣기는 사용할 수 없습니다. 직접 타이핑해 주세요." 토스트를 띄웁니다.

- 논문 리뷰: 8개 항목 textarea 전부
- Concept map: 1번 · 3번 textarea (2번 도식은 파일 첨부이므로 해당 없음)
- 서지 정보(`#f-title`, `#f-apa` 등)는 APA 자동 입력을 위해 붙여넣기 허용

## 3. 파일 구조

| 경로 | 역할 |
| --- | --- |
| `index.html` | 대문 — 타이틀·주간 일정·논문 리뷰 목록·Concept map 목록 |
| `submit.html` | 논문 리뷰 제출 — 기본 정보 / APA / 8항목 / PDF형 확인 문서 |
| `review.html` | 논문 리뷰 본문 (읽기 전용) |
| `concept.html` | Concept map 제출 — 기본 정보 / 3항목 / 도식 드래그&드롭 |
| `concept-detail.html` | Concept map 본문 (읽기 전용, 도식 이미지 표시) |
| `css/style.css` | 디자인 토큰 + 기본 레이아웃 (색·글꼴은 상단 변수에서만 수정) |
| `css/components.css` | 일정 카드, 리뷰/Concept map 카드, 작성 폼, PDF형 문서(`.doc`), 드롭존, 본문 항목, 인쇄 규칙 |
| `js/api.js` | table API 래퍼 `PL` + 유틸(주차 계산, 포맷, 이스케이프, 토스트, 테마) |
| `js/form-schema.js` | 논문 리뷰 8개 항목 정의 (단일 출처) |
| `js/apa.js` | APA 인용 파서 `APA.parse` |
| `js/typing.js` | 붙여넣기/드롭 차단 `TYPING` |
| `js/app.js` | 대문 로직 (두 목록·주차 탭·썸네일) |
| `js/submit.js` | 논문 리뷰 제출 로직 (APA 자동 입력·PDF형 확인 문서·임시 저장·갱신) |
| `js/review.js` | 논문 리뷰 본문 렌더 |
| `js/concept.js` | Concept map 제출 (도식 업로드·확인 문서·임시 저장) |
| `js/concept-detail.js` | Concept map 본문 렌더 (파일 참조 → URL 변환) |
| `js/markdown.js` | 경량 마크다운 `MD` (입력 선(先)이스케이프) |

## 4. 데이터

### `reviews` (19 필드)
- 제출 정보: `student`, `week_key`(`2026-W43`), `submitted_at`
- 서지: `apa_citation`, `paper_title`, `paper_authors`, `journal_name`, `doi`, `pub_year`
- 규칙: `ssci_confirmed`(bool) — **`ssci_evidence` 컬럼은 제거됨**
- 본문: `r1_reason` … `r8_learning` (8개, `rich_text`)

### `concept_maps` (10 필드)
- 제출 정보: `student`, `week_key`, `submitted_at`
- 본문: `cm_theory`, `cm_explanation` (`rich_text`)
- 도식: `cm_diagram_ref`(업로드 반환 reference), `cm_diagram_name`, `cm_diagram_type`, `cm_diagram_size`
  - 이미지 자체는 행에 넣지 않습니다. 파일 저장소 참조만 보관합니다.

### `students` (5 필드) — 선택
`name`, `cohort`, `email`, `active`. 지금 화면은 `students`를 쓰지 않습니다(이름 직접 입력 방식).

### `papers` (레거시)
초기 버전 스키마. 어떤 화면에서도 읽지 않습니다.

### 저장소 구분
- **프리뷰 저장소**: 편집기 미리보기가 읽는 곳. 현재 **0행**(샘플 데이터 삭제 완료).
- **라이브 D1**: Hosted Deploy 이후 실제 사이트가 읽고 쓰는 DB. 배포 전에는 비어 있습니다.
- 두 저장소는 자동 동기화되지 않습니다. 배포 시 이관 여부를 별도로 승인받아야 합니다.
- 브라우저는 상대 경로(`tables/reviews`, `tables/concept_maps`)로만 접근합니다. 직접 DB 연결 없음.

## 5. 제출 규칙

SSCI 확인 체크박스와 자동 규칙 점검(국문·MDPI 차단 등)은 제거했습니다. 이름과 논문 제목만 있으면 확인 화면으로 넘어갑니다.

## 6. 확인 화면 = PDF형 문서

`확인하기`를 누르면 입력칸이 칸칸이 나열되지 않고 **한 편의 문서**로 렌더됩니다(`.doc`).

- 상단: kicker(`PRO-AX Lab Review · Critical Review`) → 제목 → APA 인용 → 제출자·주차·제출일 표
- 본문: 항목 번호(`1.` … `8.`) 소제목 + 이어지는 산문. 항목 사이 얇은 구분선, 줄간격 1.95
- `@media print`에서 헤더·푸터·툴바를 숨겨 브라우저 인쇄/PDF 저장 시 문서만 남습니다
- Concept map 확인 문서도 동일 스타일이며, 2번 항목은 도식 이미지가 `figure`로 들어갑니다

## 7. 마크다운 서식

`js/markdown.js`가 지원합니다. 입력은 먼저 이스케이프되므로 스크립트 삽입이 불가능합니다.

- `- 항목`, `1. 항목` → 목록
- `**굵게**`, `*기울임*`, `` `코드` ``
- `> 인용` → 인용 박스
- `## 소제목` → 소제목, `---` → 구분선

## 8. 검증 상태

| 화면 | 데스크톱 | 모바일(390px) | 확인 내용 |
| --- | --- | --- | --- |
| `index.html` | ✅ | ✅ | 타이틀·일정 2칸(→ 제출 페이지)·두 목록·빈 상태 |
| `submit.html` | ✅ | ✅ | 01/02/03 섹션, SSCI 등재 근거 입력란 없음, 규칙 점검 6행 |
| PDF형 확인 문서 | ✅ | — | 연속 산문 + 번호 소제목 + 구분선, 폼 입력칸 없음 |
| `review.html?id=…` | ✅ | — | TOC, 8항목, 서지 정보, 이전/다음 |
| `concept.html` | ✅ | ✅ | 3항목(1./2./3.) 번호 라벨, 드롭존, 카운터, 모바일 오버플로 없음 |
| `concept-detail.html?id=…` | ✅ | — | 도식 표시/대체 안내, 3항목, 제출 정보 |

- APA 대량 파서는 실제 APA 인용 3건(Sitzmann 2011 / Ryan & Deci 2000 / Bandura 1977)으로 제목·저자·저널·연도·DOI 추출을 확인했습니다.
- 붙여넣기 차단은 콘솔 검사로 확인: 논문 리뷰 8개 textarea + Concept map 2개 textarea가 `paste`/`drop` 차단, `#f-title`·`#f-apa`는 허용.
- `review.html` / `concept-detail.html`은 쿼리스트링 때문에 Playwright가 직접 열지 못해, `fetch`를 스텁한 임시 하네스로 렌더를 확인한 뒤 삭제했습니다.
- 검증용 임시 파일은 모두 삭제했습니다.

## 9. 미완 / 다음 단계

- **배포**: 아직 Hosted Deploy 하지 않았습니다. 승인 절차를 거쳐야 실제 주소가 생깁니다.
- **도식 업로드**: 배포 + 플랫폼 활성화 + 소유자의 Hosted 멤버십이 있어야 `/files/concept-maps` 업로드가 동작합니다.
  그 전까지는 Concept map의 텍스트 2항목은 정상 제출되지만 도식 첨부는 안내 메시지로 실패합니다.
- **로그인/실명 확인**: 지금은 이름을 직접 입력하므로 누구나 아무 이름으로 제출할 수 있습니다.
  실명 보장이 필요하면 Hosted Access Rules + 로그인이 필요합니다(클라이언트 JS만으로는 인증 불가).
- **수정/삭제 진입점**: `submit.html?id=…`로 기존 글을 불러와 갱신할 수는 있지만, 본문 화면에 수정 버튼은 없습니다. Concept map은 수정 진입점이 아직 없습니다.
- **주차 마감**: 마감 시각, 미제출 알림, 마감 후 잠금 기능이 없습니다.
- **댓글/피드백**: 리뷰에 코멘트를 달 수 없습니다.

## 10. 참고

- 외부 의존성: Google Fonts(IBM Plex Sans KR / Mono)만 사용. 차트 라이브러리 없음.
- 디자인 토큰: `--ink #16202b`, `--muted #5a6573`, `--paper #fff`, `--tint #f3f5f8`, `--line #dde2e8`, `--accent #1d4f86`, `--accent-soft #e6edf6`, `--good #1a7f37`, `--warn #b54708`, `--danger #c0392b`.
- 디자인 레퍼런스: `hrdpro.hanyang.ac.kr/daily-insight/` 톤(절제된 타이포그래피 + 좌측 정렬 문서형 레이아웃).
