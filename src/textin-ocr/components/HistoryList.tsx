import { useEffect, useState } from 'react'
import { Button, Empty, Table, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { getExtraction, listExtractions } from '../api/ocr'
import { useI18n } from '../i18n'
import type { ExtractedField, ExtractionListItem } from '../types/ocr'

interface Props {
  refreshKey: number
  onSelect: (record: {
    extraction_id: string
    source_type: 'file' | 'url'
    source_ref: string
    summary: { page_count: number; item_count: number; duration_ms: number | null; field_count: number }
    full_result: unknown
    fields: ExtractedField[]
  }) => void
}

export default function HistoryList({ refreshKey, onSelect }: Props) {
  const { t, locale } = useI18n()
  const [items, setItems] = useState<ExtractionListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const list = await listExtractions()
      setItems(list)
    } catch (e: unknown) {
      const err = e as { message?: string }
      message.error(t('history.loadFail', { msg: err.message ?? t('common.unknownError') }))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [refreshKey])

  const view = async (id: string) => {
    setLoadingId(id)
    try {
      const rec = await getExtraction(id)
      const ti = rec.textin_response
      const pageCount = ti?.metadata?.page_count ?? ti?.pages?.length ?? 1
      const itemCount = (ti?.elements ?? []).length
      onSelect({
        extraction_id: rec.extraction_id,
        source_type: rec.source_type,
        source_ref: rec.source_ref,
        summary: {
          page_count: Number(pageCount) || 1,
          item_count: itemCount,
          duration_ms: null,
          field_count: rec.fields?.length ?? 0,
        },
        full_result: ti,
        fields: rec.fields ?? [],
      })
    } catch (e: unknown) {
      const err = e as { message?: string }
      message.error(t('history.viewFail', { msg: err.message ?? t('common.unknownError') }))
    } finally {
      setLoadingId(null)
    }
  }

  const columns: ColumnsType<ExtractionListItem> = [
    {
      title: 'extraction_id',
      dataIndex: 'extraction_id',
      width: 140,
      render: (v: string) => v.slice(0, 8) + '…',
    },
    {
      title: t('history.colType'),
      dataIndex: 'source_type',
      width: 80,
      render: (v: string) => (
        <Tag color={v === 'file' ? 'blue' : 'green'}>{v}</Tag>
      ),
    },
    {
      title: t('history.colSource'),
      dataIndex: 'source_ref',
      ellipsis: true,
    },
    {
      title: t('history.colPages'),
      dataIndex: 'page_count',
      width: 70,
    },
    {
      title: t('history.colItems'),
      dataIndex: 'item_count',
      width: 80,
    },
    {
      title: t('history.colFields'),
      dataIndex: 'field_count',
      width: 90,
    },
    {
      title: t('history.colCreatedAt'),
      dataIndex: 'created_at',
      width: 180,
      render: (v: string) =>
        new Date(v).toLocaleString(locale === 'th' ? 'th-TH' : 'en-US'),
    },
    {
      title: t('history.colAction'),
      width: 100,
      render: (_: unknown, row: ExtractionListItem) => (
        <Button
          type="link"
          loading={loadingId === row.extraction_id}
          onClick={() => view(row.extraction_id)}
        >
          {t('history.view')}
        </Button>
      ),
    },
  ]

  if (items.length === 0 && !loading) {
    return <Empty description={t('history.empty')} />
  }

  return (
    <Table<ExtractionListItem>
      rowKey="extraction_id"
      columns={columns}
      dataSource={items}
      loading={loading}
      size="small"
      pagination={{ pageSize: 8 }}
    />
  )
}
