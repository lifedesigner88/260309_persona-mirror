# AGENTS.md

## Purpose
이 저장소는 `PersonaMirror`를 실제로 구현하면서 전체 구조를 이해하고 학습하기 위한 프로젝트다.
에이전트는 빠른 구현만이 아니라, 구조와 의도를 이해할 수 있는 구현을 목표로 작업한다.

## Source of Truth
- 작업 시작 시 항상 `README.md`를 먼저 읽고 현재 상태와 우선순위를 확인한다.
- 구조, 실행 방식, 런타임 정책이 충돌하면 `README.md` 기준으로 맞춘다.
- 큰 구조 변경이 생기면 코드와 함께 `README.md`도 갱신한다.

## Working Principles
- 작은 단위로 구현한다.
- 복잡한 작업은 `설계 -> 구현 -> 검증` 순서로 진행한다.
- 설명은 추상적 개념보다 실제 파일과 코드 기준으로 한다.
- 임시 우회 코드를 남기면 제거 조건을 같이 적는다.
- 브랜치명은 `feat/ai`, `feat/auth`, `study/prompt-exp`처럼 짧고 도메인 중심으로 유지한다.
- PR은 항상 `main` 최신 기준으로 새 브랜치를 파서 만든다.
- 이미 PR을 올린 브랜치는 다음 작업에 재사용하지 않는다.

## Architecture Rules
### Monorepo
- 루트 구조는 아래를 기본으로 유지한다.
  - `apps/frontend`: UI, camera/mic control
  - `apps/backend`: FastAPI API, orchestration, DB access
  - `apps/ai-worker`: heavy inference worker
  - `libs/shared-interfaces`: frontend-backend contracts
  - `libs/ai-models`: model loading/inference wrappers
  - `libs/ui-components`: reusable UI components
  - `infrastructure/terraform`: IaC

### Frontend
- React Router의 `loader` / `action` 패턴을 기본으로 사용한다.
- 공용 UI는 `apps/frontend/src/common/components` 아래에 둔다.
- shadcn/ui 기반 공용 컴포넌트는 `apps/frontend/src/common/components/ui/*`에 두고, 외부 진입점은 `apps/frontend/src/common/components/index.ts`로 통일한다.
- 새 페이지나 새 섹션을 만들 때는 먼저 `apps/frontend/src/common/components`의 공용 UI로 조합 가능한지 확인하고, 충분하지 않을 때만 새 feature 컴포넌트를 추가한다.
- 같은 패턴이 두 번 이상 반복되면 페이지 안에서 직접 복붙하지 말고 feature `components/` 또는 공용 `common/components`로 끌어올린다.
- feature 코드는 `apps/frontend/src/features/<domain>` 아래에 둔다.
- feature 내부 `index.ts`는 진입점만 담당한다.
- 실제 `.tsx` 파일은 `components/`, `pages/`, `layout/`, `utils/`처럼 역할이 드러나는 폴더에 둔다.
- 불필요한 중첩 구조는 만들지 않는다.

### Backend
- 공통 인프라/설정 코드는 `apps/backend/app/common` 아래에 둔다.
- 기능 코드는 `apps/backend/app/features/<domain>` 아래에 둔다.
- 각 feature는 필요에 따라 `router.py`, `service.py`, `schemas.py`, `models.py`로 나눈다.
- 루트 `apps/backend/main.py`는 uvicorn 진입점만 담당한다.
- 실제 앱 조립은 `apps/backend/app/main.py`에서 수행한다.
- frontend와 backend는 가능한 한 같은 도메인 이름(`auth`, `admin`, `capture`)을 공유한다.

## Security and Data Rules
- 브라우저 토큰 저장은 `localStorage`보다 `httpOnly` cookie를 우선한다.
- 인증 secret은 코드 fallback 없이 환경변수로 강제한다.
- 저장 전 입력값 정규화(strip/validate)를 기본으로 한다.
- 개인정보(음성, 이미지, 인터뷰 텍스트)는 보수적으로 다룬다.
- 긴 AI 작업은 웹 요청과 분리하고 비동기 처리 방향을 우선한다.

## Runtime and Execution Rules
- Node는 `.nvmrc` 기준 patch 버전까지 고정한다.
  - 현재 기준값: `24.11.0`
- Python은 `.python-version` 기준 patch 버전까지 고정한다.
  - 현재 기준값: `3.11.15`
- Node 패키지 매니저는 `pnpm`을 사용한다.
- Python 패키지/가상환경 관리는 `uv`를 사용한다.
- 로컬, Dockerfile, Docker Compose는 가능한 한 같은 patch 런타임을 유지한다.

### Official Commands
기본 사용 명령은 아래만 유지한다.
- `pnpm setup`
- `pnpm dev`
- `pnpm infra:up`
- `pnpm infra:down`
- `pnpm docker`
- `pnpm docker:logs`
- `pnpm docker:down`

### Script Organization
- 루트 `package.json` 스크립트는 `setup -> dev -> infra -> docker -> quality -> raw tool` 순서로 유지한다.
- `package.json`에는 주석 대신 prefix와 순서로 분류한다.
- 초기 설치/동기화는 루트 `pnpm setup` 같은 단일 진입 명령을 우선 제공한다.
- Windows/macOS/Linux 공통 사용을 위해 bash 전용 트릭보다 Node/Python 스크립트를 우선한다.
- Docker와 로컬 개발 환경이 같은 캐시/가상환경 디렉토리를 공유하지 않도록 주의한다.

## Environment Variable Rules
- Docker Compose 데모 기본값은 루트 `compose.env`로 유지한다.
- 앱별 실제 로컬 env(`apps/frontend/.env`, `apps/backend/.env`)는 Git에 올리지 않는다.
- 앱별 예제 파일(`apps/frontend/.env.example`, `apps/backend/.env.example`)만 추적한다.
- `pnpm setup`, `pnpm dev`, `pnpm docker`는 필요 시 `.env.example`에서 `.env`를 자동 생성하는 방향을 유지한다.
- 실행 경로별 역할을 섞지 않는다.
  - local dev / local docker test: app `.env`
  - compose demo: `compose.env`

## Quality Rules
- backend test: `pnpm test:backend`
- frontend lint: `pnpm lint:frontend`
- python lint: `uvx ruff check`
- python format: `uvx ruff format`
- 공통 format: `pnpm format`
- pre-commit은 `.pre-commit-config.yaml` 기준으로 유지한다.

## Documentation Rules
- 기능을 추가하면 아래를 함께 갱신한다.
  - 필요 시 `README.md`
  - 실행 방법이 바뀌면 관련 문서
  - API가 바뀌면 요청/응답 예시
  - `docs/changelog/YYYY-MM-DD.md`
- changelog는 두 단계로 관리한다.
  - 작업 중: 한 줄 메모 누적
  - 최종 커밋 직전: 이번 커밋 범위 기준으로 다시 요약
- changelog 인덱스는 `docs/changelog/README.md`를 사용한다.
- backend API의 실행 시점 정본은 FastAPI OpenAPI(`/docs`, `/openapi.json`)로 본다.
- 수동 backend API endpoint 문서는 기본적으로 유지하지 않는다.
- backend 테스트 계획은 README가 아니라 `apps/backend/docs/api/testing.md`에서 관리한다.
- 사용자가 설명을 따로 요청하지 않아도, 큰 구조 변경이면 변경 이유를 짧게 남긴다.

## Response Style
에이전트는 기본적으로 아래를 짧게 설명한다.
- 무엇을 바꿨는지
- 왜 그렇게 바꿨는지
- 어느 파일을 보면 되는지
- 다음에 보면 좋은 포인트 1~2개

## Safety and Git Rules
- 사용자 지시 없이 파괴적 명령(`reset --hard`, 대량 삭제 등)을 실행하지 않는다.
- 기존 변경사항을 임의로 되돌리지 않는다.
- 최종 커밋 전에는 변경사항 요약을 먼저 공유하고 사용자 승인을 받은 뒤 커밋한다.
- 사용자가 커밋을 승인하면, 현재 작업 브랜치에 커밋한 뒤 같은 브랜치 이름으로 원격(`origin`)까지 푸시한다.
- PR을 다시 올릴 때는 기존 PR 브랜치를 이어붙이지 않고 `main`에서 새 브랜치를 만들어 필요한 커밋만 옮긴다.

## Default Start-of-Task Checklist
1. `README.md`에서 현재 단계와 우선순위 확인
2. 관련 디렉토리/코드 탐색
3. 변경 계획 수립
4. 구현
5. 테스트/실행 확인
6. 결과와 다음 단계 공유
