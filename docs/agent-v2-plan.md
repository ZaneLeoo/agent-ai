# 企业智能体 V2 计划

更新时间：2026-07-01

## 版本定位

V1 的目标是“独立项目可用”。V2 的目标是“规范化、结构化、可持续迭代”。

V2 不以正式嵌入 RuoYi 主前端为目标，也不处理端到端测试和构建体积优化。当前仍以 `agent-ui` 独立项目为主，重点把 Dify/SSE 规范和前端结构整理清楚。

## 核心目标

- 让 Dify 工作流配置有标准可循。
- 让前端对 Dify 节点、事件、产物的解析集中化，减少散落规则。
- 让 `AgentChat.vue` 继续瘦身，降低后续维护成本。
- 让后续开发者可以通过文档、类型和组件边界快速理解模块。

## 当前已完成

- Dify 节点命名规范文档：[dify-node-naming-convention.md](./dify-node-naming-convention.md)
- 前端 Dify 节点解析器：`src/lib/dify-node.ts`
- Dify 节点解析器单元测试：`src/lib/dify-node.test.ts`
- SSE 事件结构文档：[sse-events.md](./sse-events.md)
- SSE 事件规范化解析器：`src/lib/stream-events.ts`
- SSE 事件规范化单元测试：`src/lib/stream-events.test.ts`
- 核心展示组件拆分到 `src/features/agent/`

## 执行原则

- 每个功能或结构性调整单独提交。
- 每次代码变更后执行：

```bash
npm run test -- --run
npm run build
```

- 纯文档变更可以不跑构建，但需要独立提交。
- 优先保持现有功能稳定，不在 V2 做大规模视觉重设计。
- 遇到 Dify 或后端返回结构不确定时，先补文档和类型，再改 UI。

## 任务拆分

### 1. Dify 规范化

状态：已完成第一轮

已完成：

- 编写 Dify 节点命名规范。
- 前端新增 `parseDifyNode`，支持标准前缀、Dify `nodeType` 和关键词兜底。
- `steps.ts` 接入 `parseDifyNode`，节点展示逻辑集中到解析器。

后续增强：

- 根据真实 SSE 样例补充更多节点类型兼容规则。
- 明确分类器分支名称与前端展示关系。
- 如果后端后续支持，增加标准字段：`nodeType`、`displayName`、`nodeKind`。

验收标准：

- 新命名节点可以正确展示为“用户输入、识别意图、检索知识库、大模型思考、生成图表、整理回答”等。
- 老节点名仍有兜底展示，不出现空白步骤。

### 2. SSE 事件结构梳理

状态：已完成第一轮

目标：

- 梳理后端实际转发给前端的 SSE event 类型。
- 明确每类事件的前端消费字段。
- 尽量用 TypeScript 类型表达事件结构。

需要覆盖的事件：

```text
conversation
message
message_replace
node
workflow
artifact
error
done
```

交付物：

- `docs/sse-events.md`
- `src/types/agent.ts` 中更清晰的事件类型定义
- `src/lib/stream-events.ts`
- `src/lib/stream-events.test.ts`

验收标准：

- 前端不再依赖大段 `unknown` 强转。
- 新增或变更 event 时，开发者知道应该改哪里。

### 3. 组件拆分

状态：已完成第一轮

已完成：

- 侧栏拆分为：
  - `ConversationSidebar.vue`
  - `ConversationList.vue`
  - `UserFooter.vue`
- `LoginPanel.vue`
- `ChatWelcome.vue`
- `AssistantMessage.vue`
- `ThinkingSteps.vue`
- `AgentArtifact.vue`
- `SourcesPanel.vue`
- `ChatComposer.vue`
- `useAgentAuth.ts`

后续增强：

- 可继续抽 `useAgentChat.ts`，集中发送、停止、重试、SSE 事件合并逻辑。
- 可继续抽 `useConversations.ts`，集中会话列表、历史消息、删除和新建逻辑。

验收标准：

- `AgentChat.vue` 只保留主状态、事件编排和少量页面骨架。
- 拆分后单元测试和构建通过。

## 推荐执行顺序

1. 完成 SSE 事件结构文档和类型整理。已完成
2. 拆 `ChatWelcome`、`SourcesPanel`、`AgentArtifact`。已完成
3. 继续拆 `AssistantMessage`、`ThinkingSteps`。已完成
4. 视情况拆 `LoginPanel`。已完成
5. 编写 V2 验收记录。已完成

## V2 验收标准

- Dify 节点规范已文档化并接入前端解析。
- SSE event 结构有文档和类型定义。
- `AgentChat.vue` 明显瘦身，核心展示组件拆分完成。
- `npm run test -- --run` 通过。
- `npm run build` 通过。
- 有 V2 验收文档：[agent-v2-acceptance.md](./agent-v2-acceptance.md)。

## 不纳入 V2

- 不强制完成 RuoYi 主前端菜单集成。
- 不做 RuoYi 嵌入预研。
- 不做 Playwright 端到端测试。
- 不做构建体积优化。
- 不重做整体视觉风格。
- 不切换 Dify 或后端核心架构。
- 不做多智能体市场、插件中心等大型能力。
