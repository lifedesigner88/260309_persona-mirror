# CHANGELOG

## 2026-03-09

### 1) 초기 세팅
- Git 저장소 초기화, 첫 커밋 생성
- `README.md`, `AGENTS.md` 작성
- GitHub 원격 연결 및 `main` 푸시 완료

### 2) 브랜치 전략 문서화
- `README.md`에 Git Workflow 추가
- `AGENTS.md`에 Workflow 준수 규칙 추가

### 3) Phase 0 부트스트랩
- 기본 구조 생성: `apps/`, `libs/`, `infrastructure/`
- 설정 파일 추가: `.gitignore`, `.nvmrc`, `.python-version`, `docker-compose.yml`, `nx.json`
- 폴더 안내 문서 추가 및 `README.md` 체크리스트 일부 갱신

### 4) 학습용 병렬 작업 환경
- `git worktree`로 분리:
  - `/home/sejong/new_project` (`feat/phase0-project-bootstrap`)
  - `/home/sejong/new_project-main` (`main`)

### 5) 런타임 정책 정리
- Node 기준을 최신 LTS(`24`)로 통일
- `.nvmrc`, `docker-compose.yml`, `AGENTS.md`에 반영

### 6) Nx + 앱 스캐폴드 확장
- 루트 `package.json` 추가 및 Nx 실행 스크립트 구성
- `apps/backend` FastAPI 최소 앱 추가 (`/health`)
- `apps/frontend` React + React Router 기반 최소 구조 추가
- `docker-compose.yml`을 placeholder에서 실제 dev 명령으로 변경

### 7) 패키지 매니저 표준화
- Node는 `pnpm`, Python은 `uv` 기준으로 전환
- `pnpm-workspace.yaml` 추가
- `apps/backend` 의존성 관리를 `requirements.txt`에서 `pyproject.toml`로 전환
- `docker-compose.yml`과 Nx 실행 명령을 `pnpm/uv` 기준으로 수정

### 8) VS Code Python 인터프리터 고정
- `persona-mirror-python.code-workspace` 추가 (backend, ai-worker 멀티 루트)
- 인터프리터를 `${workspaceFolder}/.venv/bin/python`으로 고정

### 9) Health Check + CORS(.env)
- backend에 CORS 미들웨어 추가
- `BACKEND_CORS_ORIGINS`를 `.env`에서 읽도록 설정
- frontend Home 화면에 `/health` 호출 버튼 추가
- backend 실행 명령에 `--env-file .env` 반영

### 10) pnpm 버전 상향
- `package.json`의 `packageManager`를 `pnpm@10.31.0`으로 업데이트

### 11) 공통 린트/포맷/프리커밋 도입
- 루트에 ESLint/Prettier 설정 추가
- `pnpm lint`, `pnpm format` 스크립트 추가
- `.pre-commit-config.yaml` 추가 (frontend lint, python ruff, 문서 prettier check)
- README Phase 0 체크리스트에서 품질 전략 항목 완료 처리

### 12) React Router Data API 적용
- frontend 라우팅을 `loader/action` 기반으로 전환
- Home 헬스체크 요청을 `action`으로 이동하고 `Form` 제출로 처리
- 라우트 에러 출력용 `errorElement` 추가

### 13) 라우터 파일 분리
- 코드 기반 라우팅 정의를 `apps/frontend/src/router.tsx`로 분리
- `main.tsx`는 `RouterProvider` 마운트 전용으로 단순화

### 14) Tailwind + shadcn 초기 세팅
- `apps/frontend`에 Tailwind 스타일 시스템 추가
- `components.json`, `src/index.css`, `src/lib/utils.ts` 추가
- shadcn 스타일 `Button` 컴포넌트 추가 후 Home 화면에 적용

### 15) 인증/권한 기반 초기 기능
- Backend: 회원가입/로그인/JWT 인증 토큰 검증 API 추가
- Backend: PostgreSQL `users` 테이블 생성 및 `admin/1234` 시드 추가
- Backend: Admin 전용 회원조회 API(`/admin/users`) 추가
- Frontend: 로그인/회원가입/admin 회원조회 라우트 분리 (React Router loader/action)

### 16) Docker DB 연결/암호화 안정화
- backend 컨테이너 실행에서 `.env` 덮어쓰기를 제거해 compose `DATABASE_URL(db host)` 우선 사용
- 비밀번호 해시 스킴을 `pbkdf2_sha256`으로 변경해 bcrypt 충돌 로그 제거

### 17) Compose 환경변수 치환
- `docker-compose.yml`의 backend/frontend/db 설정을 `${...}` 치환 방식으로 변경
- `.env.example`에 `DATABASE_URL_DOCKER`, `POSTGRES_*` 키 추가

### 18) Admin 시드 계정 강화
- 기본 시드 비밀번호를 `Admin#2026!Mirror`로 상향
- `ADMIN_SEED_USER_ID`, `ADMIN_SEED_PASSWORD` 환경변수로 시드 계정 제어 가능하도록 변경

### 19) Docker/로컬 venv 권한 충돌 방지
- backend/ai-worker 컨테이너의 uv 프로젝트 환경을 `/tmp/...`로 분리
- 로컬 `apps/*/.venv`를 컨테이너가 건드리지 않도록 조정

### 20) VS Code 인터프리터 폴더별 고정
- `apps/backend/.vscode/settings.json` 추가
- `apps/ai-worker/.vscode/settings.json` 추가
- 각 폴더에서 `${workspaceFolder}/.venv/bin/python` 사용

### 21) VS Code 워크스페이스 확장
- 멀티 루트 워크스페이스에 `infrastructure/terraform`(`infra`) 폴더 추가

### 22) 단일 개발 실행 명령 정리
- `package.json`에 `infra:up`, `infra:down` 스크립트 추가
- `pnpm dev`가 DB/Redis 기동 후 Nx로 frontend/backend를 함께 실행하도록 변경

### 23) Frontend node_modules 권한 충돌 방지
- Docker frontend에 named volume(`/workspace/node_modules`) 추가
- 로컬 `pnpm`과 컨테이너 `pnpm`이 같은 host `node_modules`를 공유하지 않도록 조정

### 24) Vite 캐시 경로 분리
- frontend Vite `cacheDir`를 `.cache/vite/frontend`로 이동
- `apps/frontend/node_modules/.vite` 권한 충돌을 피하도록 조정

### 25) Nx dev 순서 대기 추가
- backend `dev`는 `db:5432` 준비 전까지 대기
- frontend `dev`는 backend `8000` 준비 전까지 대기
- `pnpm dev` 한 번으로 인프라 기동 후 순차 개발 실행 가능하도록 조정

### 26) JWT secret 기본값 강화
- JWT 기본 secret을 32바이트 이상 값으로 상향
- `.env.example`, docker-compose, README에 동일 기준 반영

### 27) 인증/템플릿 보안 하드닝
- 로그인 토큰 저장을 `localStorage`에서 `httpOnly` cookie 기반으로 전환
- 회원가입/로그인 입력값은 공백 제거 후 길이 검증하도록 정규화
- admin 시드 계정은 startup 시 비밀번호/권한을 환경값과 동기화
- JWT secret은 fallback 없이 필수 환경변수로 강제

### 28) 개발 환경 호환성 개선
- frontend/backend `dev` 대기를 bash `/dev/tcp`에서 Node 기반 포트 대기 스크립트로 전환
- Windows/macOS/Linux에서 같은 `pnpm dev` 흐름을 사용할 수 있도록 조정
- Docker DB는 healthcheck 기반으로 backend 시작을 지연하도록 보강

### 29) 프론트 UI 톤 정리
- 기존 auth/admin 화면 레이아웃을 더 정돈된 사이드바 + 카드 구조로 리디자인
- API/라우팅은 유지하고, 표현 계층만 조정
- 글로벌 배경/색감/상태 배지 스타일을 템플릿 기본 톤에 맞게 조정

### 30) 관리자 메뉴 표시 조건 분리
- 루트 라우트에서 `/auth/me`로 현재 세션을 확인하도록 loader 추가
- 사이드바의 `Admin users` 메뉴는 관리자 세션일 때만 노출되도록 변경
- 관리자 페이지 접근 제어는 기존 backend 권한 검사 + route loader 검사 그대로 유지

### 31) Frontend VS Code Tailwind 경고 정리
- `apps/frontend/.vscode/settings.json` 추가
- frontend 폴더를 단독으로 열어도 `@theme`, `@apply` 같은 Tailwind at-rule 경고가 뜨지 않도록 조정

### 32) Capture 입력 플로우 시작
- `capture` 라우트를 인터뷰/음성/이미지/리뷰 단계형 구조로 확장
- React Router `loader/action` 기반으로 각 단계 저장과 이동을 구현
- backend API가 붙기 전까지는 브라우저 `sessionStorage`에 로컬 draft를 저장하도록 구성

### 33) Capture 프론트 구조 분리
- 기존 `apps/frontend/src/capture.tsx` 단일 파일을 `features/capture/` 폴더 구조로 분리
- route pages, draft storage/actions, route-local UI 컴포넌트를 역할별로 정리
- 이후 backend capture API 연결 시 수정 범위를 페이지/상태 로직 기준으로 추적하기 쉽게 조정

### 34) Frontend 폴더 레이아웃 재배치
- shadcn UI 컴포넌트를 `apps/frontend/src/components/ui` 기준으로 정리
- `features/capture` 내부는 `components/`, `layout/`, `pages/`, `utils/` 기준으로 재배치
- TypeScript/Vite alias와 frontend lint 대상을 새 폴더 구조에 맞게 조정

### 35) Frontend UI 경로 재정렬
- 공용 shadcn UI는 `apps/frontend/src/common/components/ui`로 이동
- `features/capture/ui/*`는 제거하고 `features/capture/components/*` 아래 개별 파일로 재배치
- `capture` 페이지들은 공용 UI는 `@/common/components/ui`, feature 전용 UI는 `../components`만 보도록 단순화

### 36) Component index 진입점 정리
- `apps/frontend/src/common/components/index.ts`를 공용 UI 진입점으로 이동
- `features/capture/components/index.ts`는 유지하고, 실제 TSX는 `components/*`로 평탄화
- 외부 import는 `@/common/components`, `../components` 기준으로만 보이도록 정리

### 37) shadcn schema 경고 제거
- `apps/frontend/components.json`에서 원격 `$schema` 참조를 제거
- VS Code의 untrusted remote schema 경고 없이 설정 파일을 유지하도록 조정

### 38) 로그인 상태 UI 반영
- 로그인 성공 시 사이드바에서 `Sign up`/`Login` 메뉴를 숨기고 `Logout` 버튼을 표시
- 홈 화면에 현재 세션 사용자 표시를 추가하고, guest/로그인 상태에 따라 CTA를 분기

### 39) VS Code 포트 추천 우선순위 조정
- `.vscode/settings.json`에 포트 속성 추가
- `3000`은 `PersonaMirror Frontend`로 브라우저 열기 우선
- `8000`은 backend 포트로 표시하되 자동 추천은 조용히 처리

### 40) 로그아웃 루트 이동 버그 수정
- route action 기반 로그아웃을 공용 `LogoutButton` 흐름으로 교체
- 로그아웃 시 backend 호출 후 세션 revalidate와 `"/"` 이동을 명시적으로 수행

### 41) backend logout 204 응답 수정
- `/auth/logout`가 주입된 `Response`를 그대로 반환하던 문제 수정
- 명시적인 `Response(status_code=204)`를 생성해 `KeyError: None` 응답 오류를 제거

### 42) 멀티 루트 Python 인터프리터 경고 정리
- `persona-mirror-python.code-workspace`의 전역 `python.defaultInterpreterPath` 제거
- backend/ai-worker는 폴더별 `.vscode/settings.json`만 사용하고, `infra`/`frontend`/`root`에서는 잘못된 `.venv` 경고가 뜨지 않도록 조정

### 43) Backend capture job API 시작
- `capture_jobs` 테이블 추가 (`owner_user_id`, `status`, `payload`, timestamps`)
- 인증 사용자 기준 `POST /capture/jobs`, `GET /capture/jobs`, `GET /capture/jobs/{job_id}` 추가
- 현재 프론트 capture draft 구조(JSON)를 그대로 저장하고, 이후 ai-worker 큐 연결의 기준 데이터로 사용하도록 구성

### 44) Frontend/Backend 도메인 구조 정렬
- backend를 `app/common` + `app/features/{auth,admin,capture}` 구조로 재배치
- frontend auth를 `features/auth`로 이동하고, admin 페이지도 `features/admin`로 분리
- 이후 양쪽 모두 같은 도메인 이름을 기준으로 파일을 찾을 수 있도록 구조를 통일

### 45) FastAPI startup deprecated 경고 정리
- `@app.on_event("startup")`를 제거하고 `lifespan` 기반 초기화로 전환
- 테이블 생성과 admin 시드 동기화는 그대로 유지하면서 최신 FastAPI 방식에 맞춤
