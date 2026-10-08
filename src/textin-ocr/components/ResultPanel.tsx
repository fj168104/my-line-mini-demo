import { useEffect, useState } from 'react'
import { Descriptions, Empty, Input, Table, Tabs, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { ExtractResponse, ExtractedField, TextInElement, TextInPage } from '../types/ocr'
import FilePreview from './FilePreview'
import { getExtractionFileUrl } from '../api/ocr'

interface Props {
  record: ExtractResponse | null
}

export default function ResultPanel({ record }: Props) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [customNames, setCustomNames] = useState<Record<number, string>>({})

  useEffect(() => {
    setEditingIdx(null)
    setCustomNames({})
  }, [record?.extraction_id])
  if (!record) {
    return <Empty description="提交抽取后，结果会显示在这里" />
  }

  const elements = record.full_result?.elements ?? []
  const pages = record.full_result?.pages ?? []
  const markdown = record.full_result?.markdown ?? ''
  const fields = record.fields ?? []
  const previewUrl =
    record.source_type === 'file' ? getExtractionFileUrl(record.extraction_id) : null

  const fieldColumns: ColumnsType<ExtractedField> = [
    {
      title: '页',
      dataIndex: 'page_number',
      width: 60,
      render: (v: number) => (v === 0 ? '—' : v),
    },
    {
      title: '来源',
      dataIndex: 'source',
      width: 100,
      render: (v: string) => {
        const color = v === 'schema' ? 'green' : v === 'table' ? 'purple' : 'cyan'
        const label = v === 'schema' ? 'schema 精确' : v
        return <Tag color={color}>{label}</Tag>
      },
    },
    {
      title: '字段名',
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
            title="点击编辑"
          >
            {current}
            {isCustom && (
              <Tag color="blue" style={{ marginLeft: 6, fontSize: 10 }}>
                自定义
              </Tag>
            )}
          </span>
        )
      },
    },
    {
      title: '值',
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
          { key: 'pages', label: '页数', children: record.summary.page_count },
          { key: 'items', label: '识别元素数', children: record.summary.item_count },
          { key: 'fields', label: '抽取字段数', children: record.summary.field_count },
          {
            key: 'dur',
            label: '耗时 (ms)',
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
            label: `字段（${fields.length}）`,
            children: fields.length === 0 ? (
              <Empty description="本次抽取未匹配到字段名/值对" />
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
              <Empty description="无 markdown 输出" />
            ),
          },
          {
            key: 'elements',
            label: `识别元素（${elements.length}）`,
            children: elements.length === 0 ? (
              <Empty description="无识别元素" />
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
                      第 {el.page_number ?? '?'} 页 · #{idx + 1}
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {el.text || <em style={{ color: '#bbb' }}>（无文本，如纯图像元素）</em>}
                    </div>
                  </div>
                ))}
              </div>
            ),
          },
          {
            key: 'pages',
            label: `页面（${pages.length}）`,
            children: pages.length === 0 ? (
              <Empty description="无分页数据" />
            ) : (
              <div style={{ maxHeight: 400, overflow: 'auto' }}>
                {pages.map((p: TextInPage, idx: number) => (
                  <div key={idx} style={{ padding: 8 }}>
                    第 {p.page_number ?? idx} 页
                  </div>
                ))}
              </div>
            ),
          },
          {
            key: 'raw',
            label: '完整 JSON',
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
