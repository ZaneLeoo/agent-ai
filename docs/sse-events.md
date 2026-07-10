# Agent V2 SSE 协议

前端不消费 Dify 原生事件。Spring 将模型输出、工具步骤、引用和产物统一持久化为可恢复事件，再通过 `/agent/v2/runs/{runId}/events` 发布。

每个 SSE 帧包含严格递增的 `id`，`data` 为：

```json
{
  "event": "message.delta",
  "runId": 12,
  "sequence": 3,
  "timestamp": 1780000000000,
  "data": { "content": "正在分析" }
}
```

前端使用 `afterSequence` 或 `Last-Event-ID` 重连；Spring 先补发数据库历史事件，再继续发送实时事件。

| event | 前端行为 |
| --- | --- |
| `run.created` | 保存会话与运行标识 |
| `message.delta` | 追加助手文本 |
| `message.replaced` | 替换助手文本 |
| `step.started` | 展示 Java 工具的业务步骤 |
| `step.completed` | 完成步骤并展示摘要/耗时 |
| `step.failed` | 标记步骤失败 |
| `tool.started/completed/failed` | 运行审计；UI 不重复创建步骤 |
| `artifact.created` | 按 Artifact V2 白名单渲染图表、表格或文件 |
| `citation.created` | 追加知识来源 |
| `approval.required` | 展示待确认动作 |
| `run.completed/failed/cancelled` | 收敛本轮终态并关闭 SSE |

终态之后不得再产生文本或工具事件。前端只接受 `src/types/agent.ts` 声明的 V2 事件，未知或旧版 Dify 节点事件会被忽略。

代码位置：

- SSE 解析：`src/api/agent.ts`
- 事件状态合并：`src/features/agent/useAgentChat.ts`
- 类型：`src/types/agent.ts`
- 步骤：`src/lib/steps.ts`
- 产物：`src/lib/artifacts.ts`
