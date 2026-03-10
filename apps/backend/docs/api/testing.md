# Backend Test Plan

이 문서는 backend 테스트를 어떤 순서로 붙일지 정리한다.
현재 우선순위는 "핵심 API 생존 확인 -> 권한/상태 분기 확인 -> 실제 사용자 흐름 검증"이다.

## Current Command
```bash
pnpm test:backend
```

실행 경로:
- 내부적으로 `apps/backend`에서 `uv run pytest tests` 실행
- 선택적으로 `nx run backend:test`도 사용할 수 있다.

## Current Coverage
- `GET /health`
- 회원가입 / 로그인 / 로그아웃 / `/auth/me`
- admin 권한 검사
- capture job 생성 / 목록 / 단건 조회
- capture job owner FK 저장 확인
- admin의 타 사용자 capture job 조회
- 비로그인 capture 접근 거부

## Step 1. Smoke Tests
목표:
- 핵심 API가 최소한 살아 있는지 빠르게 확인

우선 대상:
- `POST /auth/signup`
- `POST /auth/login`
- `GET /auth/me`
- `GET /admin/users`
- `POST /capture/jobs`
- `GET /capture/jobs`

예상 도구:
- `pytest`
- FastAPI `TestClient` 또는 `httpx`

## Step 2. Authorization / State Tests
목표:
- role과 세션 상태에 따라 엔드포인트가 정확히 막히는지 검증

우선 대상:
- 일반 사용자 -> `GET /admin/users` 거부
- 비로그인 사용자 -> `/auth/me`, `/capture/*` 거부
- admin -> 다른 사용자 capture job 조회 가능

## Step 3. Integration Tests
목표:
- DB와 함께 backend 단독 흐름이 유지되는지 검증

우선 대상:
1. 회원가입
2. 로그인
3. 세션 확인
4. capture job 생성
5. capture job 목록 조회

## Step 4. E2E Support Boundary
backend 단독 테스트를 넘어서는 범위는 frontend / browser 계층에서 다룬다.
즉 아래 시나리오는 Playwright 같은 e2e 테스트로 넘긴다.
- 브라우저 로그인 UX
- capture step 이동 UI
- review 단계 제출 UX

## Why This Order
- smoke test가 먼저 있어야 회귀를 가장 빨리 잡는다.
- 그 다음 권한 테스트가 들어가야 admin / user 경계가 깨지지 않는다.
- 마지막에 integration / e2e를 붙여야 디버깅 범위를 좁게 유지할 수 있다.
