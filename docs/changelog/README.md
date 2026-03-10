# Changelog Index

## Structure
- 일자별 변경 기록은 `docs/changelog/YYYY-MM-DD.md` 형식으로 추가합니다.
- 초기 누적 로그는 [2026-03-09.md](2026-03-09.md)에 보존합니다.

## Operating Rules
### 1. Daily file first
- changelog는 항상 해당 날짜 파일 하나에 먼저 기록합니다.
- 새 작업을 시작하면 그 날짜 파일이 이미 있는지 확인하고, 없으면 새로 만듭니다.

### 2. During work: short memo only
- 작업 중에는 변경사항을 한 줄 메모로만 누적합니다.
- 이 단계에서는 완성된 문장보다 누락 없는 추적이 우선입니다.
- 사소한 실험, 되돌린 시도, 임시 진단도 필요하면 짧게 메모할 수 있습니다.

### 3. Before commit: rewrite by commit bundle
- 커밋 직전에는 그날의 메모를 그대로 두지 않습니다.
- 이번 커밋에 실제로 들어갈 변경만 추려서 다시 요약합니다.
- 요약 기준은 "시간순 나열"보다 "학습 순서"와 "변경 의도"를 우선합니다.
- 가능하면 아래 구조를 사용합니다.
  - `Day Summary`
  - `Recommended Reading Order`
  - 주요 단계별 `대표 커밋 / What Changed / Why It Mattered / Files To Read`
  - `End-of-Day Result`

### 4. After commit: keep only durable summary
- 커밋이 끝나면 중간 메모 성격의 문장은 지웁니다.
- 남는 내용은 커밋 히스토리와 맞는 최종 요약만 유지합니다.
- 이미 대체된 임시 메모, 겹치는 문장, 잡다한 실험 기록은 남기지 않습니다.

### 5. Relationship to git history
- changelog는 git log를 그대로 복사하는 문서가 아닙니다.
- 여러 커밋이 하나의 학습 단계를 이룬다면 한 섹션으로 묶습니다.
- 반대로 큰 커밋 하나라도 학습 포인트가 여러 개면 문서에서는 단계별로 나눌 수 있습니다.
- 중요한 것은 "나중에 커밋을 따라 공부할 때 이해가 쉬운가"입니다.

### 6. Scope discipline
- changelog는 프로젝트 전반의 운영/구조/기능 변화를 남깁니다.
- 세부 API 스펙은 changelog에 길게 쓰지 않습니다.
- endpoint 세부 설명은 코드, OpenAPI, 또는 별도 테스트/문서에 둡니다.

## Files
- [2026-03-09.md](2026-03-09.md)
- [2026-03-10.md](2026-03-10.md)
