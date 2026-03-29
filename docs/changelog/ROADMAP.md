# team-fit Roadmap

이 문서는 “앞으로 무엇을 만들까”만 적는 TODO 목록이 아니라, 이 프로젝트가 실제로 어떤 과정을 거쳐 지금의 `팀핏 탐색` 데모에 도달했는지 한눈에 보여주는 공부용 지도입니다.

기준 시점은 `2026-03-29`입니다.

이 파일을 읽을 때는 두 가지를 같이 보시면 됩니다.

1. 시간축: 제품이 어떤 방향 전환을 거쳤는가
2. 개발 위계: 어떤 층이 다음 층의 기반이 되었는가

---

## 1. 한눈에 보는 진화 과정

| 단계    | 시기                 | 그때의 중심 제품                                     | 핵심 변화                                                                                                                                    |
| ------- | -------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 0 | `2026-03-09 ~ 03-10` | 빈 모노레포 → 실행 가능한 템플릿                     | Nx, `pnpm`/`uv`, FastAPI + React Router, auth/admin 뼈대, Docker, 테스트/문서 규칙                                                           |
| Phase 1 | `2026-03-21 ~ 03-22` | `PersonaMirror` / Progressive Persona Dashboard 실험 | 영어 문서 정리, AI/Persona 중심 제품 가설, OTP 회원가입, Resend 연동, Docker/Compose 안정화                                                  |
| Phase 2 | `2026-03-23`         | `ASM 17 Community`                                   | 인증 합격자 검증, 서울 대시보드, 관리자 리뷰/승인, 커뮤니티 운영 도구 중심으로 피벗                                                          |
| Phase 3 | `2026-03-24 ~ 03-25` | `Park Sejong PR + AI Sejong + Dashboard`             | 루트가 creator PR 중심으로 이동, AI 세종 멀티턴화, creator profile/metadata/브랜딩 강화                                                      |
| Phase 4 | `2026-03-26`         | `Team-fit Explorer v1`                               | 팀핏 입력/추천 흐름이 실제 기능으로 성장, 게스트 미리보기, 승인 후 추천, 추천 상세/다이얼로그, 안전한 로컬 시드                              |
| Phase 5 | `2026-03-28 ~ 03-29` | 루트 `/` 기반 `팀핏 탐색` 1차 데모                   | 루트가 팀핏 탐색으로 재정의, 인터뷰형 프로필 입력, AI 후속 질문 3문답, 추천 후보/후보 디렉터리/핏 점수/초대코드 인증/회원탈퇴/공유 메타 완성 |

짧게 보면 이 프로젝트는 아래 순서로 변했습니다.

- `개발 템플릿`
- `Persona 실험`
- `커뮤니티 운영 도구`
- `Creator PR`
- `팀핏 탐색 제품`

즉 지금의 코드는 처음부터 `팀핏 탐색`만 보고 쌓인 것이 아니라, 여러 제품 가설이 한 저장소 안에서 점차 압축되며 현재 형태로 수렴한 결과입니다.

---

## 2. 공부 순서: 개발 위계 기준

이 프로젝트를 나중에 차례대로 뜯어볼 때는 “화면에서 먼저 보이는 것”보다 “무엇이 무엇을 가능하게 했는가” 순서로 보는 편이 훨씬 이해가 쉽습니다.

### Layer 0 — 저장소와 실행 기반

이 층은 모든 기능의 전제입니다.

- 모노레포 구조
- Node / Python 런타임 고정
- `pnpm dev`, Docker, Compose 실행 경로
- 문서/브랜치/체인지로그 규칙
- 최소 frontend/backend 연결

먼저 읽을 파일:

- [README.md](../../README.md)
- [AGENTS.md](../../AGENTS.md)
- [package.json](../../package.json)
- [scripts/setup-dev.mjs](../../scripts/setup-dev.mjs)
- [apps/backend/app/main.py](../../apps/backend/app/main.py)
- [apps/frontend/src/router.tsx](../../apps/frontend/src/router.tsx)

왜 먼저 읽어야 하나:

- 이후 모든 기능은 이 실행 정책과 디렉터리 규칙 위에 쌓였습니다.
- 여기 이해가 없으면 later phase의 변경도 “왜 이렇게 구성했는지”가 잘 안 보입니다.

### Layer 1 — 사용자, 세션, 데이터 기본선

이 층은 “누가 무엇을 저장하고 볼 수 있는가”를 결정합니다.

- 이메일 회원가입 / OTP 인증
- PIN 로그인 / PIN 재설정
- `httpOnly` cookie 세션
- 관리자 seed
- `users` 중심 데이터 모델
- 테스트 기반 auth 안정화

먼저 읽을 파일:

- [apps/backend/app/features/auth/models.py](../../apps/backend/app/features/auth/models.py)
- [apps/backend/app/features/auth/router.py](../../apps/backend/app/features/auth/router.py)
- [apps/backend/app/features/auth/service.py](../../apps/backend/app/features/auth/service.py)
- [apps/frontend/src/features/auth/pages/signup-page.tsx](../../apps/frontend/src/features/auth/pages/signup-page.tsx)
- [apps/frontend/src/features/auth/pages/login-page.tsx](../../apps/frontend/src/features/auth/pages/login-page.tsx)
- [apps/backend/tests/test_auth.py](../../apps/backend/tests/test_auth.py)

왜 중요하나:

- verification, dashboard, AI Sejong, team-fit 저장/추천 모두 결국 로그인 사용자와 권한을 전제로 움직입니다.

### Layer 2 — 합격자 검증과 운영 도구

이 층은 “공개 방문자”와 “합격/승인된 사용자”를 구분하는 운영 레이어입니다.

- verification 신청 / 수정 / 승인
- interview start time 기반 대시보드 슬롯화
- 서울 대시보드
- 관리자 승인/거절/인증취소
- reviewed member / member checks

먼저 읽을 파일:

- [apps/frontend/src/features/verification/pages/verification-page.tsx](../../apps/frontend/src/features/verification/pages/verification-page.tsx)
- [apps/backend/app/features/verification/service.py](../../apps/backend/app/features/verification/service.py)
- [apps/frontend/src/features/dashboard/pages/dashboard-page.tsx](../../apps/frontend/src/features/dashboard/pages/dashboard-page.tsx)
- [apps/backend/app/features/dashboard/service.py](../../apps/backend/app/features/dashboard/service.py)
- [apps/frontend/src/features/admin/pages/admin-verifications-page.tsx](../../apps/frontend/src/features/admin/pages/admin-verifications-page.tsx)
- [apps/frontend/src/features/admin/pages/admin-users-page.tsx](../../apps/frontend/src/features/admin/pages/admin-users-page.tsx)

왜 중요하나:

- 이 프로젝트는 한때 `커뮤니티 운영 제품`으로 강하게 피벗했기 때문에, 현재 코드에도 접근 제어와 cohort management 흔적이 깊게 남아 있습니다.
- 나중에 팀핏 탐색을 이해할 때도 “왜 승인 전에는 후보 디렉터리를 못 보는가” 같은 결정이 여기서 이어집니다.

### Layer 3 — Creator PR, Persona, AI Sejong

이 층은 제품이 한동안 `박세종 자신을 소개하는 surface`로 진화했던 시기의 결과물입니다.

- Sejong persona seed
- creator profile page
- Hupository grounding
- AI Sejong 멀티턴 채팅
- share metadata / OG 이미지 / 루트 브랜딩 변화

먼저 읽을 파일:

- [apps/backend/app/common/seed.py](../../apps/backend/app/common/seed.py)
- [apps/frontend/src/features/persona/pages/persona-page.tsx](../../apps/frontend/src/features/persona/pages/persona-page.tsx)
- [apps/backend/app/features/persona/service.py](../../apps/backend/app/features/persona/service.py)
- [apps/backend/app/features/persona/models.py](../../apps/backend/app/features/persona/models.py)
- [apps/frontend/src/features/persona/utils/api.ts](../../apps/frontend/src/features/persona/utils/api.ts)

왜 중요하나:

- 현재 제품의 메인 루트는 팀핏 탐색이지만, persona/AI surface는 여전히 supporting context로 살아 있습니다.
- 이 층을 보면 “왜 이 저장소에 creator profile과 AI chat이 같이 있는가”가 이해됩니다.

### Layer 4 — Team-Fit Explorer 핵심 루프

이 층이 현재 제품의 중심입니다.

- 루트 `/` 진입
- Step 1: 문제 한 문장 + MBTI 5축 + SDGs 4개
- Step 2: 800자 prompt
- AI 후속 질문 3문답
- 저장된 인터뷰 기록
- `추천 후보` / `팀핏 탐색 프로필` workspace
- 전체 가입 유저 디렉터리
- 실제 대화 후 fit score 저장

먼저 읽을 파일:

- [apps/frontend/src/features/teamfit/pages/team-fit-page.tsx](../../apps/frontend/src/features/teamfit/pages/team-fit-page.tsx)
- [apps/frontend/src/features/teamfit/components/conversation-priority-card.tsx](../../apps/frontend/src/features/teamfit/components/conversation-priority-card.tsx)
- [apps/frontend/src/features/teamfit/components/recommendation-card.tsx](../../apps/frontend/src/features/teamfit/components/recommendation-card.tsx)
- [apps/backend/app/features/teamfit/models.py](../../apps/backend/app/features/teamfit/models.py)
- [apps/backend/app/features/teamfit/router.py](../../apps/backend/app/features/teamfit/router.py)
- [apps/backend/app/features/teamfit/service.py](../../apps/backend/app/features/teamfit/service.py)
- [apps/backend/tests/test_teamfit.py](../../apps/backend/tests/test_teamfit.py)

왜 중요하나:

- 현재 1차 데모의 본체는 여기입니다.
- 이 층은 Layer 1 auth, Layer 2 verification, Layer 3 creator context를 모두 가져와 하나의 제품 흐름으로 묶습니다.

### Layer 5 — 데모 완성도와 마감 폴리시

마지막 층은 “기능이 있다”를 넘어서 “공유 가능한 데모인가”를 결정한 마감 작업들입니다.

- 저장 버튼 로딩
- transcript 삭제
- fit-score 우선 정렬
- invite code 자동 승인
- 회원 탈퇴
- 인증/로그인/회원가입 에러 현지화
- 네비 정리
- OG 이미지 및 공유 메타
- seed 정리

먼저 읽을 파일:

- [apps/frontend/src/features/verification/pages/verification-page.tsx](../../apps/frontend/src/features/verification/pages/verification-page.tsx)
- [apps/frontend/src/features/auth/pages/login-page.tsx](../../apps/frontend/src/features/auth/pages/login-page.tsx)
- [apps/frontend/src/features/auth/pages/signup-page.tsx](../../apps/frontend/src/features/auth/pages/signup-page.tsx)
- [apps/frontend/src/App.tsx](../../apps/frontend/src/App.tsx)
- [apps/frontend/index.html](../../apps/frontend/index.html)

왜 중요하나:

- 이 층 덕분에 현재 상태가 “기능 모음”이 아니라 “1차 데모”로 읽히게 됩니다.

---

## 3. 현재 기준 제품 위계

`2026-03-29` 기준으로 이 저장소의 visible product hierarchy는 아래와 같습니다.

1. `팀핏 탐색`
2. `인증 / 승인 / 접근 제어`
3. `추천 후보 검토와 fit score 기록`
4. `박세종 프로필 / AI 세종` 보조 맥락
5. `서울 대시보드` 운영 도구

중요한 점은, 코드베이스의 역사적 생성 순서와 현재의 제품 우선순위가 다르다는 것입니다.

- 역사적으로는 `템플릿 → Persona → Community → PR → Team-fit`
- 현재 사용자 경험에서는 `Team-fit → Verification → Recommendation Review → Persona/AI → Dashboard`

그래서 공부할 때는 아래처럼 보는 것이 좋습니다.

1. `왜 이런 저장소 구조가 생겼는가`는 시간축으로 이해
2. `지금 제품은 어디가 중심인가`는 현재 위계로 이해

---

## 4. 현재 1차 데모에서 실제로 가능한 사용자 흐름

현재 데모는 아래 한 흐름으로 이해하면 됩니다.

1. 사용자가 루트 `/`에서 팀빌딩 문제 정의와 팀핏 탐색 목적을 본다.
2. 로그인 전에도 입력 구조와 추천 미리보기를 대략 체감한다.
3. 회원가입 / 이메일 인증 / 필요 시 합격자 초대코드 인증을 거친다.
4. Step 1과 Step 2를 입력하고 저장한다.
5. AI가 후속 질문을 3번 이어서 묻고, 답변이 인터뷰 기록으로 저장된다.
6. 저장 직후 `추천 후보` 탭에서 먼저 대화할 3명을 본다.
7. 전체 가입 유저 목록과 상세 모달을 보며 실제 대화 후보를 더 좁힌다.
8. 실제로 대화한 뒤 fit score와 메모를 남긴다.
9. 필요하면 `/persona/sejong`, `/ai/sejong`, `/seoul/dashboard`로 보조 맥락을 확인한다.

즉 이 데모의 핵심은 “정답 팀을 계산한다”가 아니라 “누구와 먼저 대화할지 좁혀가는 구조”입니다.

---

## 5. 아직 메인이 아닌 축

코드에 남아 있지만 지금 공부 우선순위가 낮은 축도 있습니다.

- `capture` 관련 예전 흐름
- `apps/ai-worker`의 레거시 worker 구조
- Busan dashboard
- 더 무거운 moderation/report workflow
- 본격적인 trio recommendation
- member-facing voice/image capture relaunch

이 영역들은 “없애야 하는 찌꺼기”라기보다, 과거 실험의 흔적이거나 다음 단계 후보라고 보는 편이 맞습니다.

---

## 6. 다음에 확장될 가능성이 높은 축

지금 기록을 기준으로 보면, 다음 확장 우선순위는 대략 아래 순서입니다.

1. 실제 대화 이후의 review / shortlist / outreach memory 강화
2. 팀핏 탐색 프로필의 협업 신호와 추천 설명 품질 고도화
3. 신고 / 차단 / moderation 같은 안전장치 추가
4. 서울/부산 분리와 운영 모델 정교화
5. `AI 세종` grounding과 품질 고도화

즉 다음 단계도 완전히 새로운 제품을 만드는 것보다는, 현재 데모의 `입력 → 질문 → 추천 → 대화 → 기록` 루프를 더 정교하게 만드는 쪽에 가깝습니다.

---

## 7. 가장 추천하는 읽기 순서

정말 순차적으로 뜯어보려면 아래 순서가 가장 좋습니다.

1. [README.md](../../README.md)
2. [2026-03-09.md](2026-03-09.md)
3. [2026-03-10.md](2026-03-10.md)
4. [2026-03-23.md](2026-03-23.md)
5. [2026-03-24.md](2026-03-24.md)
6. [2026-03-25.md](2026-03-25.md)
7. [2026-03-26.md](2026-03-26.md)
8. [2026-03-28.md](2026-03-28.md)
9. [2026-03-29.md](2026-03-29.md)

이 순서로 읽으면,

- 먼저 저장소와 실행 기반을 이해하고
- 그 다음 auth / verification / dashboard 운영 도구를 이해하고
- 이후 creator/AI pivot을 지나
- 마지막에 왜 루트가 `팀핏 탐색`으로 수렴했는지 자연스럽게 보이게 됩니다.
