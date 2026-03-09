# PersonaMirror

## 1) Elevator Pitch
`나의 외형을 넘어, 가치관과 말투까지 담아내는 멀티모달 AI 디지털 페르소나 생성 서비스`

## 2) Project Overview
PersonaMirror는 텍스트(성격/가치관), 보이스(어조/화법), 비전(외형) 데이터를 통합 분석해 사용자와 닮은 예술적 디지털 자아를 생성하는 프로젝트입니다.

핵심 목표:
- 인터뷰 텍스트에서 페르소나 핵심 특성 추출
- 음성 입력에서 어조/화법 특성 반영
- Stable Diffusion + ControlNet 기반 스타일 아바타 생성
- Nx 모노레포 기반 TS + Python 폴리글랏 개발 환경 운영

## 3) Monorepo Target Structure
```text
/persona-mirror (Root)
├── apps/
│   ├── frontend/          # React Router 7 (UI, camera/mic control)
│   ├── backend/           # FastAPI (API, orchestration, DB)
│   └── ai-worker/         # Python worker (heavy inference)
├── libs/
│   ├── shared-interfaces/ # TS API contracts
│   ├── ai-models/         # SD/Whisper loading and wrappers
│   └── ui-components/     # reusable UI components
├── infrastructure/
│   └── terraform/         # AWS + Cloudflare IaC
├── docker-compose.yml     # local integrated dev stack
└── nx.json                # build cache/dependency graph
```

## 4) Tech Direction (Initial)
- Monorepo: Nx
- Frontend: React Router 7 + TypeScript + Tailwind CSS + shadcn/ui
- Backend: FastAPI + Python
- Worker: Python (GPU inference separation)
- Package Managers:
  - Node: pnpm
  - Python: uv
- AI/ML:
  - LangChain (interview -> persona extraction)
  - Whisper (voice transcription/feature extraction)
  - Stable Diffusion + ControlNet (art-style avatar generation)
- Infra/DevOps:
  - Docker Compose (local integration)
  - Terraform (AWS/Cloudflare automation)

## 5) Development Phases

### Phase 0. Foundation Setup
목표: 모노레포 기반과 공통 개발 환경 확립
- [x] Nx workspace 초기화
- [x] `apps/`, `libs/`, `infrastructure/` 기본 디렉토리 생성
- [x] Python/Node 버전 정책 확정 (`.nvmrc`, `.python-version` 등)
- [x] 공통 린트/포맷/프리커밋 전략 정의
- [x] `docker-compose.yml` 초안 작성 (frontend/backend/worker/db/cache)
- [x] Frontend 라우팅을 React Router Data API(`loader`/`action`) 기준으로 구성
- [x] Backend CORS를 `.env` 기반(`BACKEND_CORS_ORIGINS`)으로 구성
- [x] Frontend UI 기본 스택을 Tailwind CSS + shadcn/ui로 초기 세팅

### Phase 1. MVP Core Flow
목표: 최소 기능 End-to-End 데모 완성
- [x] 기본 아이디/패스워드 형태의 회원가입/로그인 기능
- [x] JWT 인증 토큰 발급 및 백엔드 토큰 검사 절차 (`httpOnly` cookie 기반 세션)
- [x] PostgreSQL 초기 데이터로 Admin 계정 시드 (`ADMIN_SEED_USER_ID`, `ADMIN_SEED_PASSWORD`)
- [x] Admin 전용 회원정보 조회 페이지 분리 (`/admin/users`)
- [x] Frontend: 인터뷰/음성/이미지 입력 UI
- [x] Backend: capture draft 요청 API + 작업 상태 API
- [ ] LangChain 기반 텍스트 페르소나 추출 파이프라인
- [ ] Whisper 기반 음성 텍스트화 및 말투 특징 추출(기초)
- [ ] SD 기반 단일 스타일 아바타 생성
- [ ] 결과 조회 화면(요약 페르소나 + 생성 이미지)

MVP 완료 기준 (DoD):
- [ ] 사용자 입력 -> 분석 -> 이미지 생성 -> 결과 확인까지 단일 플로우 성공
- [ ] 실패/재시도/타임아웃 기본 처리

### Phase 2. Quality Upgrade
목표: 페르소나 일관성과 생성 품질 개선
- [ ] ControlNet 도입으로 외형/포즈 일관성 향상
- [ ] 가치관/말투를 프롬프트 체인에 반영
- [ ] 프롬프트/파라미터 실험 체계(버전/로그) 정립
- [ ] 기본 평가 지표 정의(주관+반자동)

### Phase 3. Scalable Architecture
목표: 처리 안정성/성능/비용 최적화
- [ ] AI 작업을 큐 기반 비동기로 전환
- [ ] Worker autoscaling 전략 수립
- [ ] 캐싱/배치/모델 warm-up으로 지연 시간 절감
- [ ] GPU 비용 모니터링 대시보드 구성

### Phase 4. Deployment & Operations
목표: 운영 가능한 배포 체계 확보
- [ ] Terraform으로 AWS 리소스 코드화
- [ ] Cloudflare 연계(도메인/보안/캐싱)
- [ ] 관측성(로그/메트릭/트레이싱) 구축
- [ ] 장애 대응 Runbook 작성

## 6) Priority Risks
- GPU 비용 및 추론 지연
- 멀티모달 결과 일관성 부족
- 개인정보/음성/이미지 데이터 보안 및 권한 처리

## 7) Collaboration Rules (Working Memory)
이 문서는 개발 기준점으로 사용합니다.
- 새로운 결정은 README의 해당 섹션에 즉시 반영
- 큰 변경은 "왜 바꿨는지"를 함께 기록
- 완료된 항목은 체크박스로 상태 갱신

구조 메모:
- frontend는 `src/common` + `src/features/<domain>` 기준으로 유지
- backend는 `app/common` + `app/features/<domain>` 기준으로 유지
- 현재 공통 도메인 이름은 `auth`, `admin`, `capture`

## 8) Next Immediate Tasks
- [x] backend(FastAPI) + frontend(React) 의존성 설치(`uv`, `pnpm`) 및 실행 검증
- [ ] backend 인증/API smoke test 추가
- [ ] ai-worker와 backend 간 비동기 작업 인터페이스 초안 작성
- [x] 인터뷰/음성/이미지 입력 플로우 설계 및 화면 초안
- [ ] capture draft를 backend job 생성 API와 연결
- [ ] 실제 파일 업로드 처리(오디오/이미지) 추가

## 10) Environment Variables
- 루트 `.env` 파일 사용
- 현재 키:
  - `BACKEND_CORS_ORIGINS` (예: `http://localhost:3000`)
  - `DATABASE_URL` (로컬 실행: `localhost`, Docker backend 실행 시 compose에서 `db` host 주입)
  - `DATABASE_URL_DOCKER` (compose backend용 DB URL)
  - `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` (compose db 서비스)
  - `JWT_SECRET_KEY` (필수, SHA256 기준 32바이트 이상)
  - `JWT_EXPIRE_MINUTES`
  - `AUTH_COOKIE_NAME`, `AUTH_COOKIE_SAMESITE`, `AUTH_COOKIE_SECURE`
  - `VITE_API_BASE_URL` (예: `http://localhost:8000`)
  - `ADMIN_SEED_USER_ID` (기본: `admin`)
  - `ADMIN_SEED_PASSWORD` (기본: `Admin#2026!Mirror`)

Compose note:
- Docker backend/ai-worker는 컨테이너 내부 전용 uv 환경(`/tmp/...`)을 사용해,
  로컬 `apps/*/.venv`와 권한 충돌이 나지 않도록 구성함.
- Docker frontend는 named volume으로 `/workspace/node_modules`를 분리해,
  로컬 `node_modules` 소유권 충돌이 나지 않도록 구성함.

Auth note:
- 브라우저 세션은 `httpOnly` cookie 기반으로 처리하고, 프론트는 `credentials: "include"`로 통신함.
- 템플릿 기본값으로 `localStorage` 토큰 저장은 사용하지 않음.

## 11) Quality Commands
- lint:
  - `pnpm lint` (frontend ESLint + python Ruff check)
- format:
  - `pnpm format` (Prettier + Ruff format)
- pre-commit:
  - 1회 설치: `uvx pre-commit install`
  - 수동 실행: `uvx pre-commit run --all-files`

## 12) Dev Run
- 전체 개발 실행:
  - `pnpm dev`
  - 동작: `docker compose up -d db redis` 후 `backend`는 `db:5432` 대기, `frontend`는 `backend:8000` 대기 뒤 순차 실행
  - 포트 대기는 Node 스크립트 기반이라 Windows/macOS/Linux에서 동일하게 사용 가능
- 인프라만 실행:
  - `pnpm infra:up`
- 인프라 종료:
  - `pnpm infra:down`

## 13) Template Notes
- 템플릿 기본값은 "로컬 개발 편의"보다 "복제 후 안전한 기본값"을 우선한다.
- 인증 관련 secret은 fallback 없이 환경변수로 강제한다.
- 입력값은 저장 전에 정규화하고 검증한다.
- OS 종속 bash 트릭 대신 Node/Python 스크립트 기반 실행 보조를 우선한다.

## 9) Git Workflow (Learning Mode)
브랜치 전략:
- `main`: 항상 실행 가능한 안정 브랜치 유지
- `feat/*`: 학습 단위 기능 구현 브랜치
- `study/*`: 실험/연습 브랜치 (깨져도 허용)

브랜치 네이밍 예시:
- `feat/phase0-project-bootstrap`
- `feat/backend-fastapi-skeleton`
- `feat/frontend-input-flow`
- `study/langchain-prompt-exp-01`

작업 루틴:
1. `main` 최신화
2. 새 브랜치 생성
3. 작은 단위 커밋(의도 1개 = 커밋 1개)
4. 로컬 실행/테스트
5. 리뷰 후 `main` 병합
6. 병합 후 작업 브랜치 삭제

커밋 메시지 예시:
- `feat(backend): add persona interview endpoint`
- `fix(frontend): handle mic permission error`
- `docs(readme): update phase 1 checklist`
