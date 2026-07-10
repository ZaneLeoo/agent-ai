# 企业 Agent V2 验收基线

## 架构要求

- 前端只调用 Spring，不持有 Dify API Key。
- 一次消息先创建 Run，再订阅可恢复 SSE。
- Dify 只负责 Supervisor 工具选择；Java 负责权限、查询、事务、审计和 Artifact 校验。
- 不存在顶层问题分类器或前端 Dify 节点名称推断。
- 会话状态可跨 Run 复用最近 Dataset 和 Artifact。

## 已验证

- `query_business_data → analyze_dataset → render_chart` 真实 HTTP 工具闭环成功。
- 第二个 Run 不传 `datasetId` 时，可复用第一轮 Dataset 生成饼图。
- 停止、完成、失败只有一个终态；停止后不再记录增量文本。
- SSE 支持 sequence 重放。
- 图表只接受语义化 `chartType/categories/series`，不执行模型提供的 ECharts option、HTML 或脚本。
- `npm test -- --run`：5 个测试文件、16 项测试通过。
- `npm run build`：生产构建通过。

## Dify 环境验收

发布 Supervisor 后运行后端脚本：

```powershell
$password = Read-Host 'RuoYi password' -AsSecureString
../ruoyi-vue3-backend/ruoyi-agent/dify/verify_agent_v2.ps1 `
  -BaseUrl https://你的测试域名 `
  -Username admin `
  -Password $password
```

通过标准：Run 完成、三个业务工具全部成功、产生 Artifact、事件 sequence 严格递增。
