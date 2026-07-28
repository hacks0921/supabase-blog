# ⚡ DevLog: 나만의 모던 블로그 & 게시판
순수 정적 웹 기술(Vanilla HTML, CSS, JavaScript)과 Supabase CDN, marked.js를 활용하여 제작된 벨로그 스타일의 다크 테마 단일 페이지 애플리케이션(SPA) 블로그 & 게시판 웹앱입니다.

## 🚀 주요 특징 및 기능
- **단일 페이지 애플리케이션 (SPA)**: 브라우저 해시 라우팅을 기반으로 페이지 리로드 없이 목록, 상세 정보, 글쓰기, 글수정, 로그인 모달 등이 매끄럽고 빠르게 전환됩니다.
- **Supabase Auth 인증 연동**: 이메일 주소 기반으로 간편하게 회원가입, 로그인, 로그아웃을 처리하며 로그인한 회원 상태가 실시간으로 반영됩니다.
- **게시글 CRUD & 조회수 & 좋아요**: 로그인한 작성자만 자신의 글을 수정/삭제할 수 있으며, 조회수 1씩 증가시키는 안전한 RPC 함수와 다이나믹한 좋아요 토글 기능이 통합되어 있습니다.
- **마크다운 본문 파싱 및 뷰어**: 본문 작성 시 실시간 마크다운 문법 가이드를 제공하며, 상세보기 진입 시 marked.js CDN 파서를 통해 깔끔하게 마크다운 본문을 구조적으로 렌더링합니다.
- **Supabase Storage 이미지 첨부**: 글쓰기 화면에서 파일 탐색기를 통해 로컬 이미지를 간편하게 업로드하면, Supabase Storage에 유니크한 경로로 저장되고 결과 Public URL이 마크다운 본문 커서 위치에 즉시 주입됩니다.
- **Vercel 배포 최적화 하이브리드 로딩**: 환경변수 노출 보안을 극복하기 위해 Vercel Serverless Function을 사용해 키를 동적 서빙받습니다. 로컬 및 실배포 호스트네임을 지능적으로 자동 판별하여 설정 파일을 순차 로드함으로써 비동기 레이스 컨디션을 완전히 해결했습니다.

## 📁 프로젝트 파일 구조
- `index.html`: 블로그 마크업 및 CDN 라이브러리 로더를 담은 메인 단일 HTML 문서
- `style.css`: 에메랄드(#3ecf8e) 포인트를 적용한 벨로그 스타일 반응형 다크 테마 스타일시트
- `app_v5.js`: Supabase CRUD, Auth, 이미지 업로드, 댓글, 라우팅 및 렌더링을 제어하는 메인 비즈니스 로직 자바스크립트
- `api/config.js`: Vercel 배포 시 환경변수를 주입하기 위해 작성된 Node.js 서버리스 API 함수
- `database.sql`: Supabase 테이블 정의, RLS 보안 정책 및 RPC 함수 생성을 위한 SQL 스크립트
- `config.js`: 로컬 호스트 테스트용 실제 Supabase 주소 및 Anon Key 비공개 설정 파일 (Git 무시)
- `config.example.js`: config.js를 구성하기 위한 템플릿 파일

## ⚙️ 로컬 실행 방법
1. 프로젝트 폴더를 열고 `config.example.js` 파일을 복사하여 `config.js`를 생성합니다.
2. `config.js` 내부의 `SUPABASE_URL` 및 `SUPABASE_ANON_KEY` 값에 자신의 Supabase API 연동 주소와 Anon 키를 대입합니다.
3. 프로젝트 루트 경로에서 아래 파이썬 명령어를 통해 로컬 웹 서버를 구동합니다.
   ```bash
   python -m http.server 8000
   ```
4. 브라우저에서 `http://localhost:8000/` 로 접속합니다.

## 💾 데이터베이스 및 스크리지 설정 가이드
연동이 올바르게 구동되려면 Supabase 대시보드에서 아래 스키마 및 스토리지 버킷이 준비되어야 합니다.

### 1. Database 테이블 및 RPC 함수 설정
Supabase 대시보드 -> **SQL Editor**로 이동하여 [database.sql](database.sql) 파일의 쿼리문을 그대로 복사해 붙여넣고 **Run** 버튼을 실행해 줍니다.
- `posts`, `post_likes`, `post_comments` 테이블 생성
- 비회원 읽기 허용 및 작성자만 쓰기/수정이 가능한 RLS(Row Level Security) 정책 수립
- 안전하게 조회수를 +1 올려주는 `increment_views` RPC 함수 생성

### 2. Storage 이미지 버킷 설정
Supabase 대시보드 -> **Storage** 메뉴로 이동하여 이미지 업로드가 작동할 공간을 구성합니다.
- 버킷 생성: **New bucket**을 눌러 이름을 **`blog-attachments`** 로 지정하고, 반드시 **Public bucket** 토글을 켭니다.
- RLS 정책 추가: `Allowed operations` 중 **`INSERT`와 `DELETE`**를 체크하고 Target roles를 `authenticated`로 제한하거나 조건식에 `auth.uid() IS NOT NULL`을 입력해 로그인 유저만 버킷에 파일 추가/삭제를 허용하도록 보장합니다.

## ☁️ Vercel 배포 및 환경변수 주입 방법
1. 해당 깃허브 저장소를 Vercel 프로젝트로 신규 연결(Import)합니다.
2. Vercel 설정 -> **Environment Variables** 메뉴로 이동하여 아래 두 키-값 세트를 추가합니다.
   - `SUPABASE_URL` : [자신의 Supabase URL 주소]
   - `SUPABASE_ANON_KEY` : [자신의 Supabase Anon Public Key]
3. 등록 완료 후 **Deployments** 탭에서 최신 빌드를 **Redeploy**하여 서버리스 함수에 환경변수 주입을 활성화합니다.
