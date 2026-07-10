import { describe, expect, it } from 'vitest'
import {
  applyArtifactStep,
  applyStepFinished,
  applyStepStarted,
  applyToolFinished,
  applyToolStarted,
  type ThinkingStep,
} from './steps'

describe('Agent V2 steps', () => {
  it('updates a Java tool step by stable step id', () => {
    const steps: ThinkingStep[] = []
    applyStepStarted(steps, { stepId: 7, stepType: 'DATA_QUERY', displayName: '正在查询业务数据' })
    applyStepFinished(steps, { stepId: 7, stepType: 'DATA_QUERY', summary: '已查询12条数据', durationMs: 1250 })
    expect(steps).toEqual([{
      id: 'step:7',
      label: '正在查询业务数据',
      description: '已查询12条数据',
      status: 'complete',
    }])
  })

  it('maps semantic step types when no display name is supplied', () => {
    const steps: ThinkingStep[] = []
    applyStepStarted(steps, { stepId: 8, stepType: 'CHART_RENDER' })
    expect(steps[0].label).toBe('正在生成图表')
  })

  it('maps realtime search steps for agent tools', () => {
    const steps: ThinkingStep[] = []
    applyStepStarted(steps, { stepId: 'dify-tool:1:jina_search', stepType: 'REALTIME_SEARCH' })
    expect(steps[0].label).toBe('正在检索实时信息')
  })

  it('uses tool events as a fallback step source', () => {
    const steps: ThinkingStep[] = []
    applyToolStarted(steps, { toolCallId: 'call-1', toolCode: '联网搜索' })
    applyToolFinished(steps, { toolCallId: 'call-1', toolCode: '联网搜索' })
    expect(steps).toEqual([{
      id: 'tool:call-1',
      label: '正在调用 联网搜索',
      description: '已获取 联网搜索 结果',
      status: 'complete',
    }])
  })

  it('adds user-facing artifact steps', () => {
    const steps: ThinkingStep[] = []
    applyArtifactStep(steps, {
      type: 'CHART',
      title: '季度销售BI柱状图（测试）',
      payload: { chartType: 'bar' },
    })
    expect(steps[0]).toEqual({
      id: 'artifact:CHART:季度销售BI柱状图（测试）',
      label: '图表已生成',
      description: '柱状图',
      status: 'complete',
    })
  })
})
