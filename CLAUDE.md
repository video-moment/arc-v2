# ARC V2 — Agent Monitoring Dashboard

외부 에이전트(텔레그램 봇 등)를 **모니터링**하는 대시보드.
에이전트는 각자 돌아가고, MCP로 ARC에 상태/대화를 보고.

## 구조

```
src/
  index.ts              — 진입점, 서버 시작 + graceful shutdown
  server.ts             — Express 앱 (CORS, 라우팅, 에러 핸들러)
  types.ts              — 전체 타입 정의
  db/database.ts        — SQLite (better-sqlite3, WAL, FK)
  communication/
    monitor.ts          — 세션/메시지 관리 + 이벤트 발행
    message-bus.ts      — EventEmitter 기반 내부 이벤트 버스
  mcp/
    server.ts           — MCP 서버 (stdio transport, 별도 엔트리포인트)
    tools.ts            — MCP 도구 정의 + 핸들러
  telegram/
    bot.ts              — Telegram Bot API 클라이언트
  api/
    agents.ts           — 에이전트 등록/조회/수정/삭제
    chat.ts             — 세션/메시지 REST API
    telegram.ts         — 텔레그램 전송/웹훅/봇 목록
    status.ts           — 서버 + 에이전트 상태 API
    squads.ts           — 스쿼드 CRUD
    tasks.ts            — 태스크 CRUD
  ws/handler.ts         — WebSocket subscribe/broadcast
```

## 실행

```bash
npm run dev           # tsx watch 모드 (포트 3300)
npm run mcp           # MCP 서버 (stdio)
npm run build         # TypeScript 빌드
npm start             # 프로덕션 실행
npm test              # vitest
```

## API

- `GET /health` — 헬스 체크
- `GET /api/agents` — 에이전트 목록 (온라인/오프라인 상태 포함)
- `POST /api/agents` — 에이전트 등록
- `GET /api/chat/sessions` — 세션 목록
- `POST /api/chat/sessions` — 세션 생성
- `POST /api/chat/sessions/:id/messages` — 메시지 전송
- `GET /api/chat/sessions/:id/messages` — 메시지 히스토리
- `POST /api/telegram/send` — 앱 → 텔레그램 전송
- `POST /api/telegram/webhook/:agentId` — 텔레그램 웹훅 수신
- `GET /api/telegram/bots` — 연결된 봇 목록
- `WS /ws` — WebSocket (subscribe/unsubscribe by sessionId)

## MCP 도구

| 도구 | 용도 |
|------|------|
| `arc_register_agent` | 에이전트 등록/업데이트 |
| `arc_push_message` | 대화 메시지 푸시 |
| `arc_heartbeat` | 상태 보고 |
| `arc_list_agents` | 에이전트 목록 |
| `arc_get_messages` | 세션 메시지 조회 |
