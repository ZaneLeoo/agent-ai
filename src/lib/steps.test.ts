import { describe, expect, it } from 'vitest'
import { applyArtifactStep, applyNodeEvent, type ThinkingStep } from './steps'

describe('applyNodeEvent', () => {
  it('updates running descriptions when a node finishes', () => {
    const steps: ThinkingStep[] = []

    applyNodeEvent(steps, {
      event: 'node_started',
      title: '用户输入',
      nodeType: 'start',
    })
    applyNodeEvent(steps, {
      event: 'node_finished',
      title: '用户输入',
      nodeType: 'start',
      status: 'succeeded',
      elapsedTime: 1.2,
    })

    expect(steps).toEqual([
      {
        id: 'step:用户输入',
        label: '理解问题',
        description: '1.2 s',
        status: 'complete',
      },
    ])
  })

  it('maps dify node titles to user-facing labels', () => {
    const steps: ThinkingStep[] = []

    applyNodeEvent(steps, {
      event: 'node_finished',
      title: '问题分类器',
      nodeType: 'question-classifier',
      status: 'succeeded',
      elapsedTime: 2.6,
    })

    expect(steps[0]).toMatchObject({
      id: 'step:问题分类器',
      label: '识别意图',
      description: '2.6 s',
      status: 'complete',
    })
  })

  it('hides near-zero durations behind a completed label', () => {
    const steps: ThinkingStep[] = []

    applyNodeEvent(steps, {
      event: 'node_finished',
      title: '用户输入',
      nodeType: 'start',
      status: 'succeeded',
      elapsedTime: 0.0001,
    })

    expect(steps[0].description).toBe('已完成')
  })

  it('adds user-facing artifact steps', () => {
    const steps: ThinkingStep[] = []

    applyArtifactStep(steps, {
      type: 'chart',
      title: '季度销售BI柱状图（测试）',
      payload: { chartType: 'bar' },
    })

    expect(steps[0]).toEqual({
      id: 'artifact:chart:季度销售BI柱状图（测试）',
      label: '图表已生成',
      description: '柱状图',
      status: 'complete',
    })
  })
})
