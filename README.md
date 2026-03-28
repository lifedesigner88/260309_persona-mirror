# team-fit

현재 GitHub 저장소 주소는 `https://github.com/lifedesigner88/asm17-team-fit` 입니다.

> 팀빌딩 문제를 코테처럼 풀 수 있을까?
>
> 인생문제를 인공지능과 풀어가는 개발자, 박세종입니다.
>
> 엔지니어링의 본질은 문제를 명확히 정의하고, 기술로 더 나은 해법을 설계하는 일이라고 생각합니다.
>
> 지금 우리가 함께 겪는 문제는 분명합니다. 6개월을 함께할 300명 중, 나와 핏이 맞는 2명을 어떻게 더 나은 방식으로 찾아갈 것인가.
>
> 모든 사람을 다 만나볼 수는 없고, 자기소개서만 읽고 팀을 정할 수도 없고, 마지막에는 결국 촉까지 포함한 판단을 하게 됩니다.
>
> 그래서 저는 이 문제를 `정답을 맞히는 추천기`보다 `후보를 좁히고, 누구와 먼저 대화를 시작할지 돕는 구조`로 접근하고 있습니다.
>
> 이 저장소는 그 문제를 어떻게 보고 있고, 현재 어떤 방식으로 풀어보고 있는지 보여주는 첫 데모입니다.

영문 README는 [README_eng.md](README_eng.md)에서 볼 수 있습니다.

## 현재 제품 정의

2026-03-28 기준 이 프로젝트의 루트 경험은 `박세종 PR`이 아니라 `팀핏 탐색`입니다.

- 루트 `/`는 팀빌딩 문제를 설명하고, 곧바로 인터뷰형 팀핏 프로필 입력을 여는 `팀핏 탐색` 첫 화면입니다.
- `/persona/sejong`은 별도로 유지되는 제작자 프로필 페이지입니다.
- `/ai/sejong`은 로그인 기반 `AI 세종` 멀티턴 채팅입니다.
- `/seoul/dashboard`는 ASM17 서울 면접자 탐색과 운영 흐름입니다.
- `/team-fit`은 이전 링크 호환용 alias이며 현재는 `/`로 정리됩니다.

즉 현재 제품은 `team-fit + AI 세종 + ASM17 운영 도구`가 함께 있는 구조입니다.

## 왜 만들었나요

처음 문제의식은 SW마에스트로 17기 팀빌딩이었습니다.

대면 팀빌딩 전에는 구조화된 정보가 거의 없어서, 사람들은 이름 몇 개, 짧은 소개, GitHub 링크, 그리고 마지막 촉으로 팀을 고르게 됩니다.

이 프로젝트는 그 판단을 자동화된 정답으로 대체하려는 것이 아닙니다. 오히려 아래 질문을 더 잘 풀기 위한 도구입니다.

> 직접 만나기 전에, 누구와 먼저 대화를 시작해볼지 더 나은 방식으로 좁힐 수 없을까?

지금의 구현은 그 질문에 대한 첫 제품 실험입니다.

## 지금 사용자가 할 수 있는 것

- 루트 `/`에서 문제 정의와 팀핏 탐색 인터뷰 데모를 바로 확인하기
- 로그인 전에도 Step 1, Step 2 인터뷰 입력 구조 미리보기
- 로그인 후 Step 1에서 `문제 한 문장 + MBTI 5축 + SDGs 4개` 입력
- Step 2에서 최대 800자 Markdown 맥락 작성
- 저장 버튼 이후 AI가 3개의 추가 질문을 순차적으로 던지고, 답변 후 최종 저장
- 저장 후 `추천 후보` 탭에서 먼저 대화할 3명을 보고, `팀핏 탐색 프로필` 탭에서 입력값과 인터뷰 기록을 다시 수정해 저장하기
- `추천 후보` 탭 아래에서 전체 가입 유저를 10명씩 보고, `핏 기록 있음 / 핏 기록 없음 / 팀핏 순` 기준으로 빠르게 좁혀보기
- 추천 후보 상세나 전체 가입 유저 상세에서 실제 대화 후 `핏 점수 0~100`과 메모를 저장하고, 이미 점수를 남긴 후보는 다음 추천 목록에서 제외하기
- 저장 후 `안전한 첫 대화 / 보완형 첫 대화 / 와일드카드 대화` 3명 추천과 이유 보기
- `/persona/sejong`에서 박세종 프로필과 팀업 맥락 보기
- `/ai/sejong`에서 로그인 기반 `AI 세종` 멀티턴 채팅 사용
- 이메일 회원가입, 로그인, PIN 재설정
- 이메일 인증과 17기 합격 인증 진행
- 면접 날짜와 시작 시간 입력
- GitHub / Notion 링크 연결
- `/seoul/dashboard`에서 같이 면접 본 사람들 탐색

## 현재 핵심 사용 흐름

1. 사용자는 루트 `/`로 들어와 팀빌딩 문제 정의와 `팀핏 탐색`의 목적을 먼저 이해합니다.
2. 같은 화면에서 Step 1과 Step 2 입력 구조를 미리 둘러봅니다.
3. 로그인 후 Step 1에서 `문제 한 문장 + MBTI 5축 + SDGs 4개`를 입력합니다.
4. Step 2에서 최대 800자 Markdown으로 문제 맥락, 동기, 원하는 팀의 형태를 적습니다.
5. 저장을 누르면 AI가 기존 입력을 읽고 3개의 추가 질문을 한 개씩 이어서 묻습니다.
6. 사용자가 3번째 답변까지 마치면 인터뷰 기록이 최종 저장되고, 저장 직후에는 `추천 후보` 탭이 먼저 열립니다.
7. `추천 후보` 탭에서는 `안전한 첫 대화 / 보완형 첫 대화 / 와일드카드 대화` 3명을 먼저 보여주고, 그 아래에서 전체 가입 유저 목록을 10명씩 훑으며 `핏 기록 있음 / 핏 기록 없음 / 팀핏 순`으로 다시 좁힐 수 있습니다.
8. 실제 대화를 마친 뒤에는 추천 후보 상세에서 `핏 점수 0~100`과 메모를 저장하고, 점수를 남긴 후보는 다음 추천 목록에서 빠집니다.
9. 필요하면 `/persona/sejong`, `AI 세종`, 서울 대시보드로 이어서 더 많은 맥락을 확인합니다.

## 주요 기능

- 루트 `/`의 문제 정의 + 팀핏 탐색 landing
- 게스트 미리보기가 가능한 인터뷰형 팀핏 입력
- Step 1 `문제 한 문장 + MBTI 5축 + SDGs 4개`
- Step 2 최대 800자 Markdown 본문 입력
- 저장 시 AI가 3문답을 순차 생성하는 인터뷰 다이얼로그
- 저장 후 `추천 후보` 탭과 `팀핏 탐색 프로필` 탭 전환
- 저장된 입력값과 인터뷰 기록 재편집 후 다시 저장
- `다시 답변하기` 기반 추가 질문 누적
- 저장 후 `먼저 대화할 3명` 추천 카드와 대화 시작 질문 제안
- 추천 후보 아래에서 전체 가입 유저 디렉터리 10명씩 보기, 핏 기록 여부 필터, 팀핏 순 / 가입 순 정렬
- 추천 후보 상세와 전체 가입 유저 상세에서 실제 대화 후 `핏 점수 0~100`과 메모 저장, 저장된 후보는 다음 추천에서 자동 제외
- 제작자 프로필 페이지 `/persona/sejong`
- 로그인 사용자 전용 `AI 세종`
- 이메일 회원가입, 로그인, PIN 재설정
- 17기 이메일 인증 / 합격 인증 기반 접근 제어
- 면접 슬롯 입력과 서울 대시보드 탐색
- 한국어 / 영어 UI 지원

## AI 세종은 어떻게 작동하나요

`AI 세종`은 단순한 일회성 챗봇이 아니라 로그인 기반 멀티턴 채팅입니다.

- 로그인한 사용자만 사용할 수 있습니다.
- 질문과 답변은 DB에 저장됩니다.
- 최근 대화 일부를 다시 넣어 멀티턴 맥락을 유지합니다.
- 세종의 persona 데이터, creator profile 데이터, Hupository 핵심 문서를 함께 참고합니다.
- 현재는 `profile/persona/snapshot`에 더해 `decisions.yaml`, 최신 `session.md`, 그리고 일부 최신 저널을 조건부로 참고합니다.

아직 완성형 AI 기능은 아니지만, 팀빌딩 상황에서 어떤 질문이 실제로 나오는지 학습하는 데 중요한 실험 면입니다.

## 앞으로의 방향

지금 목표는 거대한 커뮤니티 플랫폼을 바로 만드는 것이 아닙니다.

현재는 아래 범위를 우선 단단하게 만들고 있습니다.

- 팀핏 프로필 입력을 더 자연스럽게 만들기
- 실제 대화 피드백을 받아 추천 가중치와 설명 품질을 더 다듬기
- shortlist / trio 결정에 실제로 도움이 되는 UX 찾기
- `AI 세종`의 grounding, retrieval, 대화 품질 고도화

## 기술 스택

| 레이어    | 기술                                                                      |
| --------- | ------------------------------------------------------------------------- |
| Frontend  | React 19, React Router v7, TypeScript, Tailwind CSS, Vite                 |
| Backend   | FastAPI, SQLAlchemy, Supabase Postgres, pgvector, OpenAI embeddings       |
| AI Worker | Python, LangGraph, Claude API (`claude-haiku-4-5`) — 이후 실험용으로 유지 |
| Tooling   | Nx, pnpm, uv                                                              |
| Infra     | Docker Compose                                                            |

주요 디렉터리:

- `apps/frontend` — 팀핏 탐색 인터뷰, 박세종 프로필, AI 세종, 대시보드, 검증 플로우
- `apps/backend` — 인증, 검증, 팀핏 탐색 인터뷰 API, 대시보드, 관리자, persona API
- `apps/ai-worker` — 이후 AI 기능 실험을 위한 레거시 / 실험용 워커
- `infrastructure/terraform` — 인프라 관련 작업 공간

## 로컬 개발 / 실행 방법

### 준비물

- Node `24.11.0`
- Python `3.11.15`
- `pnpm`
- `uv`
- Docker 선택 사항

### 최초 설정

```bash
git clone https://github.com/lifedesigner88/asm17-team-fit.git
cd asm17-team-fit
node scripts/setup-dev.mjs
```

초기 설정 이후에는 아래 명령을 사용합니다.

```bash
pnpm setup
```

### 환경 변수

`apps/frontend/.env`, `apps/backend/.env`는 필요할 때 `.env.example`을 기반으로 생성됩니다.

백엔드와 AI 워커를 사용하려면 다음 값을 채워야 합니다.

```text
DATABASE_URL=...
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...  # real embeddings for team-fit explorer; optional in local fallback mode
RESEND_API_KEY=...   # optional
```

AI 워커를 쓴다면 `apps/backend/.env`와 `apps/ai-worker/.env`에 같은 `DATABASE_URL`을 넣어야 합니다.

휴포지토리 기반 응답은 기본적으로 `apps/backend/hupository`를 먼저 읽습니다.
다른 위치를 쓰고 싶다면 `apps/backend/.env`에서 `HUPOSITORY_ROOT`로 경로를 지정할 수 있습니다.

`TEAMFIT_DEMO_SEED_ENABLED`가 꺼져 있지 않다면 backend startup 시 팀핏 탐색용 demo 프로필 12개가 함께 시드됩니다.

### 로컬 실행

```bash
pnpm dev
```

주요 로컬 주소:

- Frontend: `http://localhost:3000`
- 메인 진입 화면 / 팀핏 탐색: `http://localhost:3000/`
- 박세종 프로필: `http://localhost:3000/persona/sejong`
- AI 세종 페이지: `http://localhost:3000/ai/sejong`
- 기존 팀핏 링크 alias: `http://localhost:3000/team-fit` -> `http://localhost:3000/`
- 서울 대시보드: `http://localhost:3000/seoul/dashboard`
- Backend API 문서: `http://localhost:8000/docs`

### Docker 실행

```bash
pnpm docker
pnpm docker:logs
pnpm docker:down
```

### 품질 확인

```bash
pnpm test:backend
pnpm lint
pnpm format
```

## 데모 / 화면

아직 정리된 스크린샷은 저장소에 포함되어 있지 않습니다.

지금은 아래 경로로 직접 확인하는 것이 가장 빠릅니다.

- `http://localhost:3000/` — 팀핏 탐색 루트 페이지이자 기본 공유 링크
- `http://localhost:3000/persona/sejong` — 제작자 프로필 페이지
- `http://localhost:3000/ai/sejong` — AI 세종 채팅 페이지
- `http://localhost:3000/team-fit` — 이전 팀핏 링크 alias, 현재는 루트로 정리됨
- `http://localhost:3000/seoul/dashboard` — ASM17 커뮤니티 / 면접 맥락 탐색 흐름
- `http://localhost:8000/docs` — 백엔드 API 문서
