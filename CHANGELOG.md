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
