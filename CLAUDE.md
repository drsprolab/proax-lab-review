# PRO-AX Lab Review — 작업 인수인계

연구실 주간 세미나 제출·열람 사이트. 원본은 젠스파크에서 만들었고(README.md에 원래 설계가 있음), 2026-10-20부터 Claude Code로 이어서 작업 중.
사용자와는 **한국어**로 대화한다.

## 사이트 개요
- 일요일 **논문 리뷰**(8개 항목 Critical Review), 수요일 **Concept map**(이론·도식 이미지·설명) 제출
- 연구실 사람 약 20명, 주 2회. 로그인 없음, 링크로 접속
- 제출물은 누구나 목록(박스)에서 보고, 누르면 전체 본문을 읽음
- 제출 직후 "PDF로 받기"로 본인 글을 PDF로 보관 (브라우저 인쇄 → PDF로 저장)

## 사용자가 정한 것 (다시 묻지 말 것)
- Concept map 첨부는 **그림 파일만** (PDF 첨부 불필요)
- **개인 비밀번호 없음**
- SSCI 확인 체크박스·자동 규칙 점검(국문/MDPI 차단)은 **제거함** (`js/rules.js` 삭제)
- 대문 문구: "PRO-AX Lab Critical Review 공간입니다. 한 사람이 읽고 정리한 논문이 연구실 전체의 지식이 됩니다."
- 대문 문구 아래 **주의사항** 박스(`.notice`): 1. SSCI 논문만 가능 (MDPI 및 Frontiers 계열 논문 불가) 2. 본인의 인지적 노력으로 리뷰 진행 3. 시간엄수 — 안내 문구일 뿐, 자동 점검은 하지 않음
- 헤더의 "＋ Concept map 제출" / "＋ 리뷰 제출" 버튼은 같은 모양(파란 버튼)
- 목록 카드는 사용자 사이트 **Weekly Insight 목록**(https://hrdpro.hanyang.ac.kr/weekly-insight/, 저장소 `drsprolab/drsprolab.github.io`)과 같은 박스 모양 (`.inst`, `.badge`)
- 확인 화면과 PDF는 **Weekly Insight 글 페이지** 형식의 보고서 (`.rpt-*` 클래스, `PL.rptHead/rptSection/rptBody` in `js/api.js`)
  - "PDF로 받기"는 확인 화면(제출 전)과 제출 완료 화면 둘 다에 있음 → `PL.printPdf(파일명)` (브라우저 인쇄 → PDF로 저장)
  - Executive Summary 박스는 **없앰** — 보고서·PDF는 제목·서지 + 1~8번 항목만
  - 보고서·PDF 제목 아래 **제출자 이름**을 크게 (`rptHead`의 `who`)
- 논문 리뷰 **0. 논문의 핵심 키워드**: 짧은 입력칸 3개(`keyword1~3`, 타이핑 전용, `REVIEW_KEYWORDS` in `js/form-schema.js`). 보고서·PDF에는 00 섹션 칩, 본문(`review.html`)에는 "핵심 키워드" 칩. 본문의 1~8번 바로가기(목차) 줄은 **없앰**
- 본문의 원문 링크: 항상 **Google Scholar 검색**(제목 기준), DOI로 OpenAlex를 조회해 무료 원문 PDF가 있으면 **원문 PDF 받기** 버튼 추가 (`PL.scholarUrl`, `PL.openPdfUrl`)
- 대문 목록: 카드 맨 위에 **제출자 이름**(`.inst-who`). 주차 탭은 없앰 → **주차 묶음**("2026년 43주차")
  - 마감이 지나면 그 주는 접힌 묶음(`details.wk-fold`)으로 숨김: 논문 리뷰는 다음 주 **화요일 10:00**, Concept map은 그 주 **금요일 10:00** (`FOLD_AFTER`, `FOLD_HOUR` in `js/app.js`)
  - 주차는 월~일(ISO 주). 화요일 "오전"은 10시로 맞춤

## 현재 상태
- 저장소는 `js/api.js`의 `BACKEND = 'local'` — **미리보기 모드**: 제출 내용이 그 브라우저 localStorage에만 저장됨. 다른 사람에게 안 보임
  - 미리보기 모드에서는 모든 화면 헤더 아래 "시험 운영 중" 안내 띠(`.local-banner`, `js/api.js` 끝)가 뜸. 구글 연결 후 자동으로 사라짐
- 2026-10-20: 학생 화면 시험용으로 미리보기 모드 그대로 GitHub Pages 배포 (교수님 결정)
- 젠스파크 원래 저장소(`tables/…`, `/files/…`)는 젠스파크 호스팅 전용이라 GitHub Pages에서 동작하지 않음

## 다음 할 일
1. 확인 화면/PDF 보고서 형식에 대한 사용자 피드백 반영
2. **구글 연결**: Google Apps Script 웹앱 + 구글 시트(행 저장) + 구글 드라이브(도식 이미지, "링크 있는 사람 보기")
   - `js/api.js`의 `makeApi`(목록/조회/생성/수정)와 `upload`, `fileUrl`만 Apps Script 호출로 바꾸면 됨. 나머지 화면 코드는 `PL.table(...)`, `PL.upload(...)`만 씀
   - 사용자(교수님) 계정에서 시트 생성 → 스크립트 붙여넣기 → 웹앱 배포 → URL 받기 순으로 단계별 안내 필요
3. **GitHub Pages 배포** 후 학생들에게 링크 공유

## 로컬에서 미리보기
```
python3 -m http.server 8765 --bind 127.0.0.1
```
→ http://127.0.0.1:8765/index.html
