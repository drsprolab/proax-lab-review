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
- 대문 문구 아래 **주의사항** 박스(`.notice`): 1. SSCI 논문만 가능 (MDPI 및 Frontiers 계열 논문 불가) 2. 본인의 인지적 노력으로 리뷰 진행 3. 시간엄수
- **학술지 자동 점검** (2026-10-20 교수님 요청으로 다시 추가): APA 입력 시 MDPI·Frontiers 계열이거나 SSCI 미등재면 빨간 경고(`#jcheckWarn`)를 띄우고 확인·제출 버튼을 막음. `js/journal-check.js` (`JCHECK.check`)
  - MDPI·Frontiers: DOI 접두어 10.3390/10.3389, 저널 이름(Frontiers…, MDPI 대표 저널명 정확 일치), Crossref 출판사
  - SSCI: `data/ssci.json` (`{version, journals:[{title, issn, eissn}]}`)과 ISSN(Crossref)·저널 이름으로 대조. **파일이 없으면 SSCI 검사는 건너뜀** — Clarivate Master Journal List의 SSCI 목록(CSV)을 받아 변환해야 함
- 헤더의 "＋ Concept map 제출" / "＋ 리뷰 제출" 버튼은 같은 모양(파란 버튼)
- 대문(index.html) 헤더 맨 앞에 "연구실 홈" 버튼(흰 버튼) → https://hrdpro.hanyang.ac.kr/ (drsprolab.github.io)
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
- **제출 마감과 늦은 제출 표시** (2026-10-20): 논문 리뷰 = 그 주 **일요일 22:00**, Concept map = 그 주 **수요일 22:00** (한국 시간, `DEADLINE` in `js/api.js`)
  - 제출 시간은 학생이 고르는 제출일이 아니라 서버 시각(`updated_at` → `created_at`)으로 판정. 같은 주차를 다시 내면 마지막 제출 시각 기준
  - `PL.submitTime(row, kind)`: 카드(제출자 이름 아래)·본문 상단·제출 정보 표에 "제출 M.D(요일) HH:MM". 늦으면 빨간 점이 깜빡이고 "마감 후 제출"
  - 교수님 확인: 마감은 **밤 10시** (`hour: 22`)
- **논문 리뷰 9. 추가 도식 (옵션)** (2026-10-20): 8번 아래 그림 파일 1개 드래그 앤 드롭. `REVIEW_EXTRA` in `js/form-schema.js`, 필드 `r9_diagram_ref/name/type/size`. 드라이브 'PRO-AX Lab Review 도식' 폴더에 저장. 확인 화면·PDF·본문에는 올린 경우에만 9번으로 표시. 같은 주차 재제출 때 새 그림이 없으면 이전 그림 유지
- **헤더 로고** (2026-10-20): 'P' 글자 대신 연구실 로고 심볼(PRO / AX) `img/lab-mark.png`, 다크 테마는 `img/lab-mark-dark.png`

## 현재 상태
- 저장소는 구글 시트(`BACKEND = 'google'`). `GAS_URL`을 비우면 예전 미리보기 모드(localStorage)로 돌아감
- Apps Script 코드를 고치면 교수님이 편집기에 다시 붙여넣고 **배포 → 배포 관리 → 수정(연필) → 버전: 새 버전 → 배포**해야 반영됨(주소는 그대로)
  - 미리보기 모드에서는 모든 화면 헤더 아래 "시험 운영 중" 안내 띠(`.local-banner`, `js/api.js` 끝)가 뜸. 구글 연결 후 자동으로 사라짐
- 2026-10-20: 학생 화면 시험용으로 미리보기 모드 그대로 GitHub Pages 배포 (교수님 결정)
- 젠스파크 원래 저장소(`tables/…`, `/files/…`)는 젠스파크 호스팅 전용이라 GitHub Pages에서 동작하지 않음

## 다음 할 일
1. 확인 화면/PDF 보고서 형식에 대한 사용자 피드백 반영
2. **구글 연결** — 2026-10-20 연결 완료 (교수님 개인 Gmail의 시트 + Apps Script 웹앱, `GAS_URL`에 주소 넣음)
   - `apps-script/Code.gs`: 시트 탭(reviews, concept_maps)·열 자동 생성, 글자는 `'` 접두로 저장(수식·날짜 변환 방지), 도식은 드라이브 'PRO-AX Lab Review 도식' 폴더 + 링크 공유
   - `js/api.js`의 `GAS_URL`에 …/exec 주소를 넣으면 `BACKEND = 'google'`로 바뀌고 안내 띠가 사라짐. GET=목록/조회, POST(text/plain)=생성/수정/업로드
   - 도식 이미지 주소: `https://drive.google.com/thumbnail?id=<파일id>&sz=w2000`
   - 가짜 시트 위에서 Code.gs를 돌려 두 학생 제출 → 다른 브라우저 열람, 갱신, 이미지까지 확인함. 실제 구글 배포 후 다시 확인 필요
   - 교수님 안내 순서: 새 구글 시트 → 확장 프로그램 → Apps Script → Code.gs 붙여넣기 → setup 실행(권한 승인) → 배포 → 새 배포 → 웹 앱(실행: 나, 액세스: 모든 사용자) → …/exec 주소 받기
3. **GitHub Pages 배포** 후 학생들에게 링크 공유

## 로컬에서 미리보기
```
python3 -m http.server 8765 --bind 127.0.0.1
```
→ http://127.0.0.1:8765/index.html
