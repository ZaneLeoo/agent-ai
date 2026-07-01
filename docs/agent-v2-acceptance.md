# 企业智能体 V2 验收记录

验收日期：2026-07-01

## 验收结论

V2 第一轮目标已完成，可以作为后续迭代的稳定基线。

本轮 V2 聚焦“规范化、结构化、可持续迭代”，不包含 RuoYi 主前端嵌入、Playwright 端到端测试、构建体积优化和整体视觉重做。

## 已完成范围

### 1. Dify 节点规范

- 已新增 Dify 节点命名规范文档：`docs/dify-node-naming-convention.md`
- 已新增节点解析器：`src/lib/dify-node.ts`
- 已将节点解析接入思考步骤：`src/lib/steps.ts`
- 已补解析测试：`src/lib/dify-node.test.ts`

当前支持：

- 标准前缀：`[输入]`、`[意图]`、`[知识]`、`[模型]`、`[图表]`、`[回答]`
- Dify `nodeType` 兜底
- 老节点名称关键词兜底

### 2. SSE 事件结构

- 已新增 SSE 事件文档：`docs/sse-events.md`
- 已在 `src/types/agent.ts` 定义 `AgentStreamEvent` 联合类型
- 已新增 SSE 规范化解析器：`src/lib/stream-events.ts`
- 已将 `src/api/agent.ts` 接入规范化解析
- 已补解析测试：`src/lib/stream-events.test.ts`

当前覆盖：

- `conversation`
- `message`
- `message_replace`
- `node`
- `workflow`
- `artifact`
- `sources`
- `message_end`
- `done`
- `error`
- `unknown`

### 3. 前端组件拆分

已拆分到 `src/features/agent/`：

- `ConversationSidebar.vue`
- `ConversationList.vue`
- `UserFooter.vue`
- `LoginPanel.vue`
- `ChatWelcome.vue`
- `ThinkingSteps.vue`
- `SourcesPanel.vue`
- `AgentArtifact.vue`
- `AssistantMessage.vue`
- `ChatComposer.vue`

已抽出状态逻辑：

- `useAgentAuth.ts`

`AgentChat.vue` 当前继续保留页面编排、会话状态和 SSE 聊天流处理。后续可继续拆 `useAgentChat.ts` 和 `useConversations.ts`。

## 验证结果

最近一次验证：

```bash
npm run test -- --run
npm run build
```

结果：

- 单元测试通过：7 个测试文件，25 个测试
- 生产构建通过
- 仍有既有 Rolldown pure annotation 和 chunk 体积 warning，不影响构建结果

## 后续建议

V2 后续增强建议独立进入下一阶段：

- 抽 `useAgentChat.ts`，集中发送、停止、重试、SSE 合并逻辑
- 抽 `useConversations.ts`，集中会话列表、历史消息、新建和删除逻辑
- 根据更多真实 Dify SSE 样例补充解析测试
- 后端若能补标准字段，前端可减少对节点命名和关键词兜底的依赖
