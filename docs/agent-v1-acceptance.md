# 企业智能体第一版验收记录

更新时间：2026-06-30

## 第一版目标

第一版以独立 `agent-ui` 项目可用为主，不把嵌入 RuoYi 主前端作为当前硬目标。核心目标是让用户可以登录、查看会话、发起智能体对话，并稳定展示 Dify/RuoYi 后端返回的回答、处理步骤、图表/表格产物和知识库来源。

## 已完成能力

- 登录：支持使用 RuoYi 账号登录；后端未开启验证码时隐藏验证码输入。
- 会话：支持会话列表、新建会话、加载历史消息、删除会话。
- 移动端：窄屏提供会话抽屉入口，保留新建会话与用户退出入口。
- SSE 聊天：支持 `/agent/chat/stream` 流式返回，能处理 `conversation`、`message`、`message_replace`、`node`、`workflow`、`artifact`、`error`、`done` 等前端已接入事件。
- 处理步骤：按 Dify 节点映射展示执行过程，完成、失败、取消有明确状态。
- 产物渲染：支持图表和表格产物展示，图表使用 ECharts 渲染。
- 知识库来源：使用 ai-elements-vue `Sources` 组件展示参考来源、相关度和片段摘要。
- 失败恢复：流式请求失败后保留错误信息，并可用原问题重试。
- 复制：助手回答提供复制按钮。
- 工程化：`agent-ui` 已独立建 git 仓库，远程为 `git@github.com:ZaneLeoo/agent-ai.git`；`.env` 已忽略，`.env.example` 提供必要配置示例。

## 当前提交

- `809c3c7 chore: establish agent ui baseline`
- `2afc4a2 feat: allow retrying failed chat streams`
- `6a6bbec feat: add assistant response copy action`
- `2b7b4a3 feat: add mobile conversation drawer`
- `2e2650f refactor: extract conversation sidebar components`

## 验证记录

最近一次验证：

```bash
npm run test -- --run
npm run build
```

结果：

- 单元测试：5 个测试文件通过，15 条测试通过。
- 生产构建：通过。
- 构建警告：仍有 `@vueuse/core` 的 Rolldown pure annotation 警告，以及部分 chunk 超过 500 kB 的提示；这是当前依赖和 Markdown/图表能力带来的体积问题，不影响第一版功能验收。

## 当前边界

- 当前以独立项目运行，不承诺已完成 iframe 嵌入和 RuoYi 主前端菜单集成。
- Dify 节点名称映射已经可用，但后续应沉淀为更明确的“节点命名规范 + 前端展示规则”。
- 图表和表格渲染由我们自己实现，ai-elements-vue 主要负责对话、思考过程、来源等 AI UI 基础组件。
- 复制能力目前是复制整段助手回答；代码块级复制后续可在 Markdown 渲染层进一步增强。
- 前端已覆盖主要单元测试，但还缺少真实浏览器下的端到端验证。

## 下一阶段建议

- 补一份 Dify 工作流节点命名规范，约定分析、知识库、图表、表格、工具等节点的展示映射。
- 优化构建体积，重点处理 Markdown 高亮、Mermaid/ECharts 等重依赖的按需加载。
- 继续拆分 `AgentChat.vue`：把登录、消息流、产物渲染拆成更独立的 feature 组件或 composable。
- 增加 Playwright 冒烟测试，覆盖登录、发消息、来源展开、移动端会话抽屉。
- 第二阶段再处理嵌入 RuoYi 主前端、菜单和权限联动。
