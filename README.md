# 귀인 — 팀빌딩 데모

> 부제: 내가 좋아하는 사람이 나를 좋아할 확률은?

이 저장소는 제가 최종적으로 만들고 싶은 프로젝트 `귀인`의 세 가지 주제

- 데이팅
- 멘토링
- 팀빌딩

중 `팀빌딩`을 먼저 풀어본 1차 데모 레포지토리입니다.

또 이 레포는 `10일간 바이브 코딩만으로 만든 프로젝트`이기도 합니다.

---

## 무엇을 풀고 있나

이 문제는 보통 `Reciprocal Recommender Systems` 라고 부릅니다.

- 사람을 콘텐츠처럼 추천하는 것이 아니라
- 양쪽이 서로 수락해야 성립하는 추천 시스템

저는 AI를 활용해, 인간관계 문제를 마치 코딩테스트처럼 더 구조적으로 풀어보고 싶습니다.

그중 지금 이 레포는 이런 질문을 실험합니다.

> 직접 만나기 전에, 누구와 먼저 대화해볼지 더 잘 좁혀갈 수 있을까?

즉 `최고의 팀원을 정답처럼 맞히는 것`보다 `먼저 대화할 사람을 더 잘 찾는 것`에 초점을 둡니다.

---

## 이 데모에서 보여주는 것

현재 중심 화면은 루트 `/`의 `팀핏 탐색`입니다.

사용자는 아래 흐름을 경험할 수 있습니다.

- 팀빌딩 문제 정의와 팀핏 탐색 소개 보기
- Step 1에서 `문제 한 문장 + MBTI 5축 + SDGs 4개` 입력
- Step 2에서 최대 800자 맥락 작성
- 저장 후 AI 후속 질문 3개에 답하며 인터뷰 기록 저장
- `추천 후보` 탭에서 먼저 대화해볼 3명과 이유 확인
- 전체 가입 유저를 보고 실제 대화 후 `핏 점수`와 메모 기록
- 인증, 승인, 초대코드, 회원 탈퇴까지 포함한 접근 제어 흐름 확인

보조적으로 아래 화면도 함께 남아 있습니다.

- `/persona/sejong` — 박세종 프로필
- `/ai/sejong` — AI 세종
- `/seoul/dashboard` — ASM17 서울 운영 도구

---

## 이 프로젝트를 이해하려면

아래 순서로 보면 전체 맥락이 가장 빨리 잡힙니다.

1. [docs/changelog/ROADMAP.md](docs/changelog/ROADMAP.md)

`ROADMAP.md`에는 이 프로젝트가 `템플릿 → Persona 실험 → 커뮤니티 운영 도구 → Creator PR → 팀핏 탐색 데모`로 어떻게 진화했는지가 정리되어 있습니다.

---

## 기술 스택

- Frontend: React 19, React Router v7, TypeScript, Tailwind CSS, Vite
- Backend: FastAPI, SQLAlchemy, Supabase Postgres, pgvector
- Tooling: Nx, pnpm, uv

---

## 로컬 실행

```bash
pnpm setup
pnpm dev
```

- Frontend: `http://localhost:3000`
- Backend docs: `http://localhost:8000/docs`
