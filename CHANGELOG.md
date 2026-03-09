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
