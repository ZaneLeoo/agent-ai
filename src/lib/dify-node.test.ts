import { describe, expect, it } from 'vitest'
import { parseDifyNode } from './dify-node'

describe('parseDifyNode', () => {
  it('uses the standard Dify title prefix first', () => {
    expect(parseDifyNode('[知识] 销售知识检索', 'llm')).toMatchObject({
      kind: 'knowledge',
      displayLabel: '检索知识库',
      rawPrefix: '知识',
    })
  })

  it('falls back to Dify node type when no prefix exists', () => {
    expect(parseDifyNode('问题分类', 'question-classifier')).toMatchObject({
      kind: 'intent',
      displayLabel: '识别意图',
    })
  })

  it('falls back to title keywords for legacy node names', () => {
    expect(parseDifyNode('图表生成')).toMatchObject({
      kind: 'chart',
      displayLabel: '生成图表',
    })
    expect(parseDifyNode('直接回复 2')).toMatchObject({
      kind: 'answer',
      displayLabel: '整理回答',
    })
  })

  it('keeps unknown nodes generic', () => {
    expect(parseDifyNode('自定义节点')).toMatchObject({
      kind: 'generic',
      displayLabel: '处理步骤',
    })
  })
})
