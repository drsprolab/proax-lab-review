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
- 헤더의 "＋ Concept map 제출" / "＋ 리뷰 제출" 버튼은 같은 모양(파란 버튼)
- 목록 카드는 사용자 사이트 **Weekly Insight 목록**(https://hrdpro.hanyang.ac.kr/weekly-insight/, 저장소 `drsprolab/drsprolab.github.io`)과 같은 박스 모양 (`.inst`, `.badge`)
- 확인 화면과 PDF는 **Weekly Insight 글 페이지** 형식의 보고서 (`.rpt-*` 클래스, `PL.rptHead/rptSection/rptBody` in `js/api.js`)
  - Executive Summary 박스 = 5번 "핵심 메세지" (본문 05와 중복됨 — 사용자 확인 대기)

## 현재 상태
- 저장소는 `js/api.js`의 `BACKEND = 'local'` — **미리보기 모드**: 제출 내용이 그 브라우저 localStorage에만 저장됨. 다른 사람에게 안 보임
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
