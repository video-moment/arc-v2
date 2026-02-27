# ARC V2

에이전트를 만들고, 팀으로 묶고, 일을 시키는 독립 플랫폼.

## 구조

```
src/
  index.ts              — 진입점, 서버 시작 + graceful shutdown
  server.ts             — Express 앱 (CORS, 라우팅, 에러 핸들러)
  types.ts              — 전체 타입 정의
  db/database.ts        — SQLite (better-sqlite3, WAL, FK)
  engine/
    agent-registry.ts   — YAML → DB upsert, CRUD
    agent-runner.ts     — Claude CLI subprocess 실행
    prompt-builder.ts   — 대화 히스토리 조립 (토큰 제한 대응)
  communication/
    chat-manager.ts     — 세션/메시지 관리 + 에이전트 실행 통합
    message-bus.ts      — EventEmitter 기반 내부 이벤트 버스
  api/
    agents.ts           — GET/POST/PUT/DELETE /api/agents
    chat.ts             — 세션/메시지 REST API
    status.ts           — 서버 상태 API
  ws/handler.ts         — WebSocket subscribe/broadcast
data/
  agents/               — 에이전트 YAML 정의 (디렉토리별)
  arc.db                — SQLite DB (gitignore)
```

## 실행

```bash
npm run dev           # tsx watch 모드 (포트 3300)
npm run build         # TypeScript 빌드
npm start             # 프로덕션 실행
```

## API

- `GET /health` — 헬스 체크
- `GET /api/agents` — 에이전트 목록
- `POST /api/chat/sessions` — 세션 생성 `{ agentId }`
- `POST /api/chat/sessions/:id/messages` — 메시지 전송 `{ content }`
- `GET /api/chat/sessions/:id/messages` — 메시지 히스토리
- `WS /ws` — WebSocket (subscribe/unsubscribe by sessionId)

## 에이전트 추가

`data/agents/<agent-id>/agent.yaml` 파일 생성:

```yaml
name: My Agent
description: 설명
system_prompt: |
  시스템 프롬프트
model: sonnet
max_turns: 10
```

서버 재시작 시 자동 로드.

## 기술 스택

- TypeScript (ESM), better-sqlite3, Express, ws
- Claude CLI (`--print` 모드) 로 에이전트 실행
- CLAUDECODE 환경변수 제거 필수 (중첩 세션 방지)
