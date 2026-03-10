# PersonaMirror

`나의 외형을 넘어, 가치관과 말투까지 담아내는 멀티모달 AI 디지털 페르소나 생성 서비스`

## What This Repository Is
PersonaMirror는 텍스트, 음성, 이미지 입력을 바탕으로 사용자의 디지털 페르소나를 생성하는 서비스를 단계적으로 구현하는 학습용 모노레포입니다.

이 저장소는 두 가지 목표를 함께 가집니다.
- 실제 서비스 구조를 갖춘 프로젝트를 단계적으로 구현한다.
- 왜 이런 구조를 선택했는지 이해할 수 있도록, 코드와 문서를 함께 정리한다.

## Current Status
현재 기준으로 동작하는 범위는 아래와 같습니다.
- 회원가입 / 로그인 / 로그아웃
- `httpOnly` cookie 기반 세션 인증
- admin 계정 시드 및 관리자 전용 회원 목록 조회
- 인터뷰 / 음성 / 이미지 입력용 capture UI 초안
- capture job 생성 / 조회 API
- 세 가지 실행 경로 모두 검증 완료
  - local dev: `pnpm dev`
  - Dockerfile test: `pnpm docker`
  - Docker Compose demo: `docker compose up`

아직 구현되지 않은 핵심 범위는 아래입니다.
- LangChain 기반 페르소나 추출
- Whisper 기반 음성 분석
- Stable Diffusion / ControlNet 기반 이미지 생성
- ai-worker와 backend 간 비동기 작업 처리

## Tech Stack
- Monorepo: Nx
- Frontend: React Router 7, TypeScript, Tailwind CSS, shadcn/ui
- Backend: FastAPI, SQLAlchemy, PostgreSQL
- Worker: Python, uv
- Package manager:
  - Node: pnpm
  - Python: uv
- Infra / local runtime:
  - Docker Compose
  - Terraform

## Runtime Policy
재현성을 위해 로컬과 Docker 런타임 버전을 patch까지 고정합니다.
- Node: `24.11.0`
- Python: `3.11.15`
- Postgres: `16.13-alpine`
- Redis: `7.4.7-alpine`

관련 파일:
- [/.nvmrc](/home/sejong/new_project/.nvmrc)
- [/.python-version](/home/sejong/new_project/.python-version)
- [/apps/frontend/Dockerfile](/home/sejong/new_project/apps/frontend/Dockerfile)
- [/apps/backend/Dockerfile](/home/sejong/new_project/apps/backend/Dockerfile)
- [/docker-compose.yml](/home/sejong/new_project/docker-compose.yml)

## Quick Start
사전 조건:
- `nvm`
- `corepack`
- `uv`
- `docker`
- `docker compose`

초기 설치:
```bash
nvm install 24.11.0
nvm use 24.11.0
corepack enable
uv python install 3.11.15
pnpm setup
```

`pnpm setup`가 하는 일:
- `apps/frontend/.env.example` -> `apps/frontend/.env` 자동 생성
- `apps/backend/.env.example` -> `apps/backend/.env` 자동 생성
- Node 의존성 설치
- backend / ai-worker Python 환경 동기화

## Run Modes
### 1. Local Development
가장 자주 쓰는 실행 경로입니다.

```bash
pnpm dev
```

동작:
- `db`, `redis`를 Docker Compose로 실행
- Nx가 `backend`, `frontend`를 로컬 dev server로 실행
- backend는 `5432` 준비를 기다린 뒤 시작
- frontend는 `8000` 준비를 기다린 뒤 시작

종료:
- 앱 프로세스 종료: `Ctrl+C`
- 남아 있는 `db`, `redis` 종료:
```bash
pnpm infra:down
```

### 2. Dockerfile Test
앱 Dockerfile 자체가 실제로 빌드되고 실행되는지 검증할 때 사용합니다.

```bash
pnpm docker
```

동작:
- `db`, `redis`를 Docker Compose로 실행
- Nx가 frontend / backend Docker 이미지를 BuildKit으로 빌드
- build 로그는 Nx 콘솔에 stream 형태로 출력
- 빌드 후 frontend / backend 컨테이너를 detached 모드로 실행

로그 확인:
```bash
pnpm docker:logs
```

종료:
```bash
pnpm docker:down
```

### 3. Docker Compose Demo
외부 사용자가 가장 단순하게 데모를 확인할 수 있는 경로입니다.

```bash
docker compose up
```

종료:
```bash
docker compose down
```

주의:
- `pnpm infra:down`은 `db`, `redis`만 내립니다.
- `docker compose down`은 compose로 띄운 전체 서비스(frontend, backend, ai-worker, db, redis)를 내립니다.

## Environment Variables
### Policy
- 실제 앱 로컬 env는 Git에 올리지 않습니다.
- 예제 파일만 추적합니다.
- Docker Compose demo 기본값은 추적 가능한 [compose.env](/home/sejong/new_project/compose.env)로 유지합니다.

### Files
- frontend example: [/apps/frontend/.env.example](/home/sejong/new_project/apps/frontend/.env.example)
- backend example: [/apps/backend/.env.example](/home/sejong/new_project/apps/backend/.env.example)
- compose demo env: [/compose.env](/home/sejong/new_project/compose.env)

### Effective Use
- local dev / local docker test:
  - `apps/frontend/.env`
  - `apps/backend/.env`
- compose demo:
  - `compose.env`

### Important Keys
- frontend:
  - `VITE_API_BASE_URL`
- backend:
  - `DATABASE_URL`
  - `JWT_SECRET_KEY`
  - `BACKEND_CORS_ORIGINS`
  - `AUTH_COOKIE_*`
  - `ADMIN_SEED_*`
- compose / db:
  - `POSTGRES_DB`
  - `POSTGRES_USER`
  - `POSTGRES_PASSWORD`

## What Is Implemented Today
### Auth
- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

### Admin
- `GET /admin/users`
- admin 세션일 때만 프론트 메뉴 노출

### Capture
- `POST /capture/jobs`
- `GET /capture/jobs`
- `GET /capture/jobs/{job_id}`
- 프론트는 step-based capture UI를 제공하며, 현재는 review 단계 전까지 draft를 client side에 보관

### Health
- `GET /health`

## Monorepo Structure
```text
/persona-mirror
├── apps/
│   ├── frontend/
│   ├── backend/
│   └── ai-worker/
├── libs/
│   ├── shared-interfaces/
│   ├── ai-models/
│   └── ui-components/
├── infrastructure/
│   └── terraform/
├── docs/
│   └── changelog/
├── scripts/
├── docker-compose.yml
└── nx.json
```

### Frontend Structure
원칙:
- 공용 UI는 `src/common/components`
- feature 코드는 `src/features/<domain>`
- React Router `loader` / `action`을 기본 패턴으로 사용

현재 주요 도메인:
- `auth`
- `admin`
- `capture`

### Backend Structure
원칙:
- 공통 코드는 `app/common`
- 기능 코드는 `app/features/<domain>`
- feature는 필요에 따라 `router.py`, `service.py`, `schemas.py`, `models.py`로 분리

현재 주요 도메인:
- `auth`
- `admin`
- `capture`

## Roadmap
### Phase 0. Foundation Setup
- [x] Nx workspace 초기화
- [x] 공통 런타임 / lint / format / pre-commit 정리
- [x] local / docker / compose 실행 경로 정리
- [x] frontend / backend 기본 구조 정리

### Phase 1. MVP Core Flow
- [x] 기본 인증
- [x] admin 조회 화면
- [x] capture UI 초안
- [x] capture job API
- [ ] capture review -> backend job API 연결
- [ ] 파일 업로드 처리
- [ ] AI 분석 / 생성 파이프라인 연결

### Phase 2+
- [ ] 품질 개선
- [ ] 비동기 작업 분리
- [ ] 인프라 자동화
- [ ] 운영 관측성

## Next Recommended Work
- `capture review` 단계에서 backend `POST /capture/jobs` 연결
- backend auth / capture smoke test 추가
- ai-worker와 backend 간 비동기 작업 인터페이스 초안 작성
- 실제 파일 업로드 처리(오디오 / 이미지) 추가

## Quality Commands
```bash
pnpm lint
pnpm format
uvx pre-commit install
uvx pre-commit run --all-files
```

## Changelog
- 인덱스: [/docs/changelog/README.md](/home/sejong/new_project/docs/changelog/README.md)
- 일자별 기록: `docs/changelog/YYYY-MM-DD.md`

기록 방식:
- 작업 중: 한 줄 메모 누적
- 커밋 직전: 커밋 범위 기준으로 요약 정리

## Git Workflow
브랜치 전략:
- `main`: 안정 브랜치
- `feat/*`: 기능 브랜치
- `study/*`: 실험 브랜치

브랜치 예시:
- `feat/ai`
- `feat/auth`
- `feat/capture`
- `study/prompt-exp`

커밋 원칙:
- 작은 단위 커밋 유지
- 최종 커밋 전 변경 요약 확인
- 승인 후 현재 브랜치를 원격까지 푸시

## Why This Repo Is Useful For Learners
이 저장소는 단순한 튜토리얼이 아니라 아래를 같이 보여줍니다.
- feature 기반 폴더 구조 설계
- local / docker / compose 실행 경로 분리
- env 정책 정리
- 인증, 관리자 기능, capture 플로우의 실제 구현 방식
- 이후 ai-worker와 모델 파이프라인으로 확장 가능한 구조
