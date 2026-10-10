import { useEffect, useState } from 'react'
import { Descriptions, Empty, Input, Table, Tabs, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { ExtractResponse, ExtractedField, TextInElement, TextInPage } from '../types/ocr'
import { useI18n } from '../i18n'
import FilePreview from './FilePreview'
import { getExtractionFileUrl } from '../api/ocr'

interface Props {
  record: ExtractResponse | null
}

export default function ResultPanel({ record }: Props) {
  const { t } = useI18n()
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [customNames, setCustomNames] = useState<Record<number, string>>({})

  useEffect(() => {
    setEditingIdx(null)
    setCustomNames({})
  }, [record?.extraction_id])
  if (!record) {
    return <Empty description={t('result.empty')} />
  }

  const elements = record.full_result?.elements ?? []
  const pages = record.full_result?.pages ?? []
  const markdown = record.full_result?.markdown ?? ''
  const fields = record.fields ?? []
  const previewUrl =
    record.source_type === 'file' ? getExtractionFileUrl(record.extraction_id) : null

  const fieldColumns: ColumnsType<ExtractedField> = [
    {
      title: t('result.colPage'),
      dataIndex: 'page_number',
      width: 60,
      render: (v: number) => (v === 0 ? '—' : v),
    },
    {
      title: t('result.colSource'),
      dataIndex: 'source',
      width: 100,
      render: (v: string) => {
        const color = v === 'schema' ? 'green' : v === 'table' ? 'purple' : 'cyan'
        const label = v === 'schema' ? t('result.schemaExact') : v
        return <Tag color={color}>{label}</Tag>
      },
    },
    {
      title: t('result.colField'),
      dataIndex: 'name',
      width: 200,
      render: (v: string, _row: ExtractedField, idx: number) => {
        const current = customNames[idx] ?? v
        if (editingIdx === idx) {
          return (
            <Input
              autoFocus
              size="small"
              defaultValue={current}
              onBlur={(e) => {
                const next = e.target.value.trim()
                setCustomNames((prev) => ({ ...prev, [idx]: next || v }))
                setEditingIdx(null)
              }}
              onPressEnter={(e) => {
                const next = (e.target as HTMLInputElement).value.trim()
                setCustomNames((prev) => ({ ...prev, [idx]: next || v }))
                setEditingIdx(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setEditingIdx(null)
              }}
            />
          )
        }
        const isCustom = customNames[idx] !== undefined && customNames[idx] !== v
        return (
          <span
            onClick={() => setEditingIdx(idx)}
            style={{ cursor: 'pointer', color: isCustom ? '#1677ff' : undefined }}
            title={t('result.clickEdit')}
          >
            {current}
            {isCustom && (
              <Tag color="blue" style={{ marginLeft: 6, fontSize: 10 }}>
                {t('result.custom')}
              </Tag>
            )}
          </span>
        )
      },
    },
    {
      title: t('result.colValue'),
      dataIndex: 'value',
      ellipsis: true,
      render: (v: string) => (
        <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{v}</span>
      ),
    },
  ]

  return (
    <>
      <Descriptions
        size="small"
        column={2}
        bordered
        items={[
          { key: 'id', label: 'extraction_id', children: record.extraction_id },
          {
            key: 'src',
            label: 'source_type',
            children: (
              <Tag color={record.source_type === 'file' ? 'blue' : 'green'}>{record.source_type}</Tag>
            ),
          },
          { key: 'ref', label: 'source_ref', children: record.source_ref, span: 2 },
          { key: 'pages', label: t('result.pages'), children: record.summary.page_count },
          { key: 'items', label: t('result.items'), children: record.summary.item_count },
          { key: 'fields', label: t('result.fields'), children: record.summary.field_count },
          {
            key: 'dur',
            label: t('result.duration'),
            children: record.summary.duration_ms ?? '—',
          },
        ]}
      />

      {previewUrl && (
        <div style={{ marginTop: 16, padding: 12, background: '#fafafa', borderRadius: 4 }}>
          <FilePreview fileUrl={previewUrl} filename={record.source_ref} />
        </div>
      )}

      <Tabs
        style={{ marginTop: 16 }}
        items={[
          {
            key: 'fields',
            label: t('result.tabFields', { n: fields.length }),
            children: fields.length === 0 ? (
              <Empty description={t('result.emptyFields')} />
            ) : (
              <Table<ExtractedField>
                rowKey={(_, idx) => String(idx)}
                columns={fieldColumns}
                dataSource={fields}
                size="small"
                pagination={false}
                scroll={{ y: 400 }}
              />
            ),
          },
          {
            key: 'md',
            label: 'Markdown',
            children: markdown ? (
              <pre
                style={{
                  maxHeight: 400,
                  overflow: 'auto',
                  background: '#fafafa',
                  padding: 12,
                  borderRadius: 4,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {markdown}
              </pre>
            ) : (
              <Empty description={t('result.emptyMd')} />
            ),
          },
          {
            key: 'elements',
            label: t('result.tabElements', { n: elements.length }),
            children: elements.length === 0 ? (
              <Empty description={t('result.emptyElements')} />
            ) : (
              <div style={{ maxHeight: 400, overflow: 'auto' }}>
                {elements.map((el: TextInElement, idx: number) => (
                  <div
                    key={el.element_id ?? idx}
                    style={{
                      borderBottom: '1px dashed #eee',
                      padding: '6px 0',
                    }}
                  >
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
                      <Tag color="default">{el.type ?? '?'}</Tag>
                      {t('result.pageOf', { n: el.page_number ?? '?' })} · #{idx + 1}
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {el.text || <em style={{ color: '#bbb' }}>{t('result.noText')}</em>}
                    </div>
                  </div>
                ))}
              </div>
            ),
          },
          {
            key: 'pages',
            label: t('result.tabPages', { n: pages.length }),
            children: pages.length === 0 ? (
              <Empty description={t('result.emptyPages')} />
            ) : (
              <div style={{ maxHeight: 400, overflow: 'auto' }}>
                {pages.map((p: TextInPage, idx: number) => (
                  <div key={idx} style={{ padding: 8 }}>
                    {t('result.pageOf', { n: p.page_number ?? idx })}
                  </div>
                ))}
              </div>
            ),
          },
          {
            key: 'raw',
            label: t('result.tabRaw'),
            children: (
              <pre
                style={{
                  maxHeight: 500,
                  overflow: 'auto',
                  background: '#1e1e1e',
                  color: '#d4d4d4',
                  padding: 12,
                  borderRadius: 4,
                  fontSize: 12,
                }}
              >
                {JSON.stringify(record.full_result, null, 2)}
              </pre>
            ),
          },
        ]}
      />
    </>
  )
}
