# Agent UI

企业 Agent V2 的独立 C 端 Vue 3 前端，可独立运行，也可由 RuoYi 后台通过 iframe/postMessage 安全注入登录上下文。

## 本地运行

```bash
npm install
npm run dev
```

默认地址为 `http://localhost:5174`，`/dev-api` 代理到 `http://localhost:8088`。

## 验证

```bash
npm test -- --run
npm run build
```

## 协议

前端调用：

- `POST /agent/v2/runs`
- `GET /agent/v2/runs/{runId}/events`
- `POST /agent/v2/runs/{runId}/cancel`
- `/agent/conversations` 会话管理接口

完整事件约定见 [docs/sse-events.md](docs/sse-events.md)。前端不解析 Dify 原生 workflow/node 事件，也不接收 Dify API Key。
