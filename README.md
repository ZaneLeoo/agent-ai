# Agent UI

企业智能助手的独立 Vue 3 前端，可独立运行，也可由 RuoYi 后台通过 iframe/postMessage 安全注入登录上下文。

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

- `POST /agent/chat/stream`

当前只消费 `message`、`metadata`、`done`、`error` 四类 SSE 事件。前端不接收 Dify API Key。
