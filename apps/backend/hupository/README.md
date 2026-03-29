# Hupository

이 폴더는 상위 **private coaching repository**에서 추린 **public mirror**입니다.

작동 규칙 전체를 공개하는 저장소가 아니라, 박세종이 어떤 사람이고 지금 무엇에 집중하고 있는지 외부 독자가 빠르게 이해할 수 있도록 정리한 공개 데이터 레이어입니다.

빠르게 보려면:
[Profile](data/profile.yaml) · [Now](data/08_now/snapshot.yaml) · [Goals](data/06_goals/tree.yaml) · [Decisions](data/08_now/decisions.yaml)

바깥 링크:
[GitHub](https://github.com/lifedesigner88) · [Blog](https://blog.naver.com/lifedesigner88) · [YouTube](https://www.youtube.com/@sejongclass) · [SejongClass](https://sejongclass.kr/)

## 어디부터 보면 좋을까

읽는 목적에 따라 아래 경로가 가장 빠릅니다.

### 30초 코스

- [data/profile.yaml](data/profile.yaml)
- [data/08_now/snapshot.yaml](data/08_now/snapshot.yaml)
- [data/06_goals/tree.yaml](data/06_goals/tree.yaml)

지금 어떤 사람이고, 무엇을 밀고 있는지 가장 빨리 파악할 수 있습니다.

### 3분 코스

- [data/08_now/decisions.yaml](data/08_now/decisions.yaml)
- [data/02_experience/projects/sejongclass.yaml](data/02_experience/projects/sejongclass.yaml)
- [data/03_skills/technical.yaml](data/03_skills/technical.yaml)

최근 판단, 실제 프로젝트, 협업 가능한 기술 결을 보기 좋은 경로입니다.

### 10분 코스

- [data/06_goals/lifetime.yaml](data/06_goals/lifetime.yaml)
- [data/04_story/chapters/2025-2026_founder.md](data/04_story/chapters/2025-2026_founder.md)
- [data/05_interests/reading/2026.yaml](data/05_interests/reading/2026.yaml)

왜 이런 방향으로 움직이는지, 사고의 뿌리와 변화 맥락까지 보고 싶다면 이 경로가 좋습니다.

## 30초 소개

- 교육 현장에서 오래 사람을 가르치고 돕다가, 지금은 교육과 기술을 연결하는 빌더로 전환 중입니다.
- 현재의 핵심 축은 `세종클래스`, `Hupository`, `PersonaMirror`입니다.
- 결과물만 보여주는 포트폴리오보다, 방향과 판단의 맥락까지 함께 드러내는 방식을 더 중요하게 생각합니다.

조금 더 압축하면 이런 사람입니다.

> 오래 가르친 사람이자, 지금은 직접 만들고 실험하는 사람.
> 교육자 감각과 개발자 실행력을 함께 가져가는 빌더.

## 지금 집중하는 것

2026-03-25 기준, 현재 방향은 아래 세 축으로 정리됩니다.

- `세종클래스`
  수학·물리·코딩·라이프디자인을 연결하는 1인 교육 플랫폼을 직접 기획·개발·운영하고 있습니다.
- `Hupository / PersonaMirror`
  한 사람의 데이터와 현재 상태를 구조화하고, 그것을 AI와 연결해 자기이해·협업·팀 핏 탐색에 쓰는 방향으로 발전시키고 있습니다.
- `AI 빌더 역량 고도화`
  `React 19`, `FastAPI`, `LangGraph`, `OpenAI API`, `PostgreSQL`, `Redis`를 중심으로 실제 서비스와 데모를 빠르게 만들고 검증하고 있습니다.

## 이 저장소를 왜 공개하나

대부분의 자기소개는 결과만 보여줍니다.
하지만 실제 사람은 결과보다도 방향, 맥락, 변화 과정으로 더 잘 이해된다고 생각합니다.

그래서 Hupository는 아래 질문에 답하는 공개 저장소를 지향합니다.

- 이 사람은 지금 무엇을 만들고 있는가
- 왜 그 방향을 선택했는가
- 어떤 경험과 기술 위에서 움직이는가
- 장기적으로는 어디를 향하고 있는가

## 이 저장소는 어떻게 읽으면 되나

이 저장소는 정적인 소개 페이지보다, 계속 업데이트되는 공개 데이터 셋에 가깝습니다.

```text
정체성 / 경험 / 스킬 / 목표 / 현재 상태
                    ↓
          공개 가능한 변화와 판단만 기록
                    ↓
         외부 독자가 더 정확하게 이해할 수 있음
```

작동 원리의 세부 규칙은 private repository에서 관리합니다.
이 public mirror에서는 구조와 현재 상태를 읽는 데 필요한 정보만 공개합니다.

## 구조를 간단히 보면

```text
hupository/
├── README.md
└── data/
    ├── 01_identity/
    ├── 02_experience/
    ├── 03_skills/
    ├── 04_story/
    ├── 05_interests/
    ├── 06_goals/
    ├── 07_matching/
    ├── 08_now/
    └── 09_journal/
```

더 자세한 구조 규칙은 [data/schema.yaml](data/schema.yaml)에서 볼 수 있습니다.

## 공개 원칙

- 개인식별정보와 민감정보는 공개 대상에서 분리합니다.
- 대신 방향, 전환, 현재 고민처럼 맥락을 이해하는 데 중요한 정보는 가능한 한 숨기지 않습니다.
- 좋은 모습만 전시하는 포트폴리오보다, 이해 가능한 기록을 더 중요하게 생각합니다.
