import { describe, expect, it } from 'vitest'
import { formatSourceScore, getSourcesFromStreamData } from './sources'

describe('source helpers', () => {
  it('extracts normalized sources from standard sources event', () => {
    expect(
      getSourcesFromStreamData({
        sources: [
          {
            id: 'seg-1',
            title: 'sale.txt',
            sourceType: 'knowledge',
            content: '客户首次咨询后 24 小时内完成首次跟进。',
            score: 0.94,
            position: 1,
          },
        ],
      }),
    ).toEqual([
      {
        id: 'seg-1',
        title: 'sale.txt',
        sourceType: 'knowledge',
        content: '客户首次咨询后 24 小时内完成首次跟进。',
        score: 0.94,
        position: 1,
        documentName: undefined,
        datasetName: undefined,
        segmentId: undefined,
        page: undefined,
      },
    ])
  })

  it('extracts sources from Dify retriever resources', () => {
    const sources = getSourcesFromStreamData({
      metadata: {
        retriever_resources: [
          {
            position: 1,
            dataset_name: 'sale.txt...',
            document_name: 'sale.txt',
            segment_id: 'seg-2',
            score: 0.334,
            content: '二、客户跟进要求',
            page: null,
          },
        ],
      },
    })

    expect(sources[0]).toMatchObject({
      id: 'seg-2',
      title: 'sale.txt',
      sourceType: 'knowledge',
      documentName: 'sale.txt',
      datasetName: 'sale.txt...',
      content: '二、客户跟进要求',
      score: 0.334,
      position: 1,
      page: null,
    })
  })

  it('formats source score as percentage', () => {
    expect(formatSourceScore(0.945)).toBe('95%')
    expect(formatSourceScore(undefined)).toBe('')
  })
})
