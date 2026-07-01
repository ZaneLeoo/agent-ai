# Agent SSE 事件结构

更新时间：2026-07-01

## 目的

`/agent/chat/stream` 通过 SSE 向前端推送智能体执行过程。前端需要同时处理 Dify 工作流事件、后端补充事件、图表/表格产物和知识库来源。

本文档定义当前前端消费的事件结构，减少代码中散落的 `unknown` 强转，并为后续后端补枚举或标准字段提供依据。

## 前端处理链路

```text
SSE frame
  -> parseRawSseFrame
  -> normalizeAgentStreamEvent
  -> AgentChat.handleStreamEvent
```

- `parseRawSseFrame`：只负责解析 SSE 文本，保留原始 `event` 和 `data`。
- `normalizeAgentStreamEvent`：把原始事件归一化为前端可消费的联合类型。
- `handleStreamEvent`：只处理标准事件，不再直接写大段 `unknown` 强转。

## 事件总览

| event | 用途 | 前端动作 |
| --- | --- | --- |
| `conversation` | 返回或更新会话信息，也可能携带产物/来源元数据 | 设置 `conversationId`，提取 artifacts/sources |
| `message` | 增量回答文本 | 追加到助手消息 |
| `message_replace` | 替换回答文本 | 覆盖助手消息内容 |
| `node` | Dify 节点执行过程 | 更新思考步骤 |
| `workflow` | Dify 工作流状态 | 工作流完成时标记步骤完成并折叠 |
| `artifact` | 图表/表格等结构化产物 | 渲染产物并增加产物步骤 |
| `sources` | 知识库来源 | 追加知识库来源 |
| `message_end` | Dify 消息结束事件，可能携带 metadata/source | 追加知识库来源 |
| `done` | 本轮流式响应结束 | 结束流式状态，标记步骤完成 |
| `error` | 服务端或 Dify 错误 | 展示错误并允许重试 |
| unknown | 未识别事件 | 暂不展示，但保留 `originalEvent` 便于调试 |

## 事件结构

### conversation

```json
{
  "event": "conversation",
  "data": {
    "conversationId": 48,
    "title": "分析销售趋势并生成图表"
  }
}
```

前端消费字段：

- `conversationId`：当前会话 ID。
- `title`：会话标题，可选。
- 其它字段会保留，用于从 `outputs`、`metadata`、`artifacts`、`sources` 中提取产物或来源。

### message

```json
{
  "event": "message",
  "data": {
    "content": "好的，"
  }
}
```

前端消费字段：

- `content`：增量文本。前端会追加到当前助手消息。

### message_replace

```json
{
  "event": "message_replace",
  "data": {
    "content": "完整的新回答"
  }
}
```

前端消费字段：

- `content`：替换当前助手消息内容。

### node

```json
{
  "event": "node",
  "data": {
    "event": "node_finished",
    "title": "[知识] 销售知识检索",
    "nodeType": "knowledge-retrieval",
    "status": "succeeded",
    "elapsedTime": 1.2
  }
}
```

前端消费字段：

- `event`：节点事件，例如 `node_started`、`node_finished`。
- `title`：Dify 节点名称。前端会使用 Dify 节点命名规范解析展示类型。
- `nodeType`：Dify 或后端节点类型。
- `status`：节点状态。
- `elapsedTime`：耗时，单位由后端当前返回决定，前端按秒展示。

相关文档：

- [Dify 节点命名规范](./dify-node-naming-convention.md)

### workflow

```json
{
  "event": "workflow",
  "data": {
    "event": "workflow_finished",
    "status": "succeeded"
  }
}
```

前端消费字段：

- `event`：工作流事件。当前主要消费 `workflow_finished`。
- `status`：工作流状态。

### artifact

```json
{
  "event": "artifact",
  "data": {
    "type": "chart",
    "title": "季度销售BI柱状图",
    "payload": {
      "chartType": "bar",
      "categories": ["Q1", "Q2"],
      "series": [{ "name": "销售额", "data": [255, 198] }]
    }
  }
}
```

前端消费字段：

- `type`：产物类型，当前支持 `chart`、`table`。
- `title`：产物标题。
- `payload`：产物数据。

兼容说明：

- 前端也会从 `conversation.data.artifacts`、`conversation.data.outputs.artifacts`、`conversation.data.outputs.outputs` 中提取产物。

### sources / message_end

```json
{
  "event": "sources",
  "data": {
    "sources": [
      {
        "title": "sale.txt",
        "content": "客户首次咨询后 24 小时内完成首次跟进。",
        "score": 0.79
      }
    ]
  }
}
```

前端消费字段：

- `sources`：标准来源数组。
- `metadata.retriever_resources`：Dify 常见知识库召回结构。
- `outputs.result`：部分工作流可能把来源放在输出结果中。

### done

```json
{
  "event": "done",
  "data": {}
}
```

前端动作：

- 结束流式状态。
- 标记所有步骤完成。
- 延迟折叠思考步骤。

### error

```json
{
  "event": "error",
  "data": {
    "message": "服务端错误",
    "code": "DIFY_ERROR"
  }
}
```

前端消费字段：

- `message`：展示给用户的错误信息。
- `code`：错误码，可选。

前端动作：

- 标记当前助手消息失败。
- 结束流式状态。
- 保留原始问题，允许用户重试。

## 未知事件策略

未识别事件会被归一化为：

```json
{
  "event": "unknown",
  "originalEvent": "custom_event",
  "data": {}
}
```

当前前端不展示 unknown 事件，但不会抛错。后续如果某个 unknown 事件变成稳定能力，应补充：

- 本文档事件说明。
- `src/types/agent.ts` 类型定义。
- `src/lib/stream-events.ts` 归一化规则。
- 对应单元测试。

## 代码位置

- 类型定义：`src/types/agent.ts`
- SSE 文本解析：`src/api/agent.ts`
- 事件归一化：`src/lib/stream-events.ts`
- 节点名称解析：`src/lib/dify-node.ts`
- 页面消费：`src/views/AgentChat.vue`

## 后端建议

后端后续可以补充枚举或标准字段，降低前端对 Dify 文本结构的依赖。

推荐事件枚举：

```text
conversation
message
message_replace
node
workflow
artifact
sources
message_end
done
error
```

推荐 node 事件标准字段：

```json
{
  "nodeKind": "knowledge",
  "displayName": "销售知识检索",
  "nodeType": "knowledge-retrieval"
}
```

前端升级优先级：

1. 优先使用后端标准字段。
2. 其次解析 Dify 节点命名前缀。
3. 最后使用关键词兜底。
