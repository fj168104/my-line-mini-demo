import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Checkbox,
  Descriptions,
  Empty,
  Input,
  Modal,
  Space,
  Table,
  Tabs,
  Tag,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type {
  ExtractionRecord,
  ExtractResponse,
  ExtractedField,
  TextInElement,
  TextInPage,
} from '../types/ocr'
import { useI18n } from '../i18n'
import FilePreview from './FilePreview'
import { getExtractionFileUrl, refineOCR } from '../api/ocr'

interface Props {
  record: ExtractResponse | null
  /** refine 成功 → 父组件用刷新后的 record 替换 current */
  onRefined?: (record: ExtractionRecord) => void
}

export default function ResultPanel({ record, onRefined }: Props) {
  const { t } = useI18n()
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [customNames, setCustomNames] = useState<Record<number, string>>({})

  // refine mode: 每行可选 checkbox + 底部 "Refine selected" 按钮
  const [refineMode, setRefineMode] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const [refining, setRefining] = useState(false)

  useEffect(() => {
    setEditingIdx(null)
    setCustomNames({})
    setRefineMode(false)
    setSelected(new Set())
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
  const canRefine = record.source_type === 'file'

  const selectedNames = useMemo(
    () => Array.from(selected).map((i) => fields[i]?.name).filter((n): n is string => !!n),
    [selected, fields],
  )

  function toggleAll(value: boolean) {
    if (value) {
      setSelected(new Set(fields.map((_, i) => i)))
    } else {
      setSelected(new Set())
    }
  }

  function openConfirm() {
    if (!selected.size) {
      Modal.warning({ title: t('result.refine.empty') })
      return
    }
    setModalOpen(true)
  }

  async function doRefine() {
    if (!record) return
    if (selectedNames.length === 0) return
    if (selectedNames.length > 50) {
      Modal.warning({ title: t('result.refine.failed', { msg: '>50 fields' }) })
      return
    }
    setRefining(true)
    try {
      const updated = await refineOCR({
        extraction_id: record.extraction_id,
        field_names: selectedNames,
      })
      message.success(t('result.refine.done', { n: selectedNames.length }))
      setModalOpen(false)
      setRefineMode(false)
      setSelected(new Set())
      onRefined?.(updated)
    } catch (e) {
      const err = e as { message?: string }
      message.error(t('result.refine.failed', { msg: err.message ?? t('common.unknownError') }))
    } finally {
      setRefining(false)
    }
  }

  const baseColumns: ColumnsType<ExtractedField> = [
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
        // refine mode: 不要可点击编辑，避免与 checkbox 冲突
        if (refineMode) {
          return <span>{current}</span>
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

  const fieldColumns: ColumnsType<ExtractedField> = refineMode
    ? [
        {
          title: (
            <Checkbox
              checked={selected.size === fields.length && fields.length > 0}
              indeterminate={selected.size > 0 && selected.size < fields.length}
              onChange={(e) => toggleAll(e.target.checked)}
            />
          ),
          width: 40,
          render: (_: unknown, _row: ExtractedField, idx: number) => (
            <Checkbox
              checked={selected.has(idx)}
              onChange={(e) => {
                setSelected((prev) => {
                  const next = new Set(prev)
                  if (e.target.checked) next.add(idx)
                  else next.delete(idx)
                  return next
                })
              }}
            />
          ),
        },
        ...baseColumns,
      ]
    : baseColumns

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
            children: (
              <>
                {canRefine && fields.length > 0 && (
                  <Space style={{ marginBottom: 12 }}>
                    <Button
                      size="small"
                      onClick={() => {
                        const next = !refineMode
                        setRefineMode(next)
                        if (next) setSelected(new Set(fields.map((_, i) => i)))
                        else setSelected(new Set())
                      }}
                    >
                      {refineMode ? t('result.refine.exit') : t('result.refine.toggle')}
                    </Button>
                    {refineMode && (
                      <>
                        <Button size="small" onClick={() => toggleAll(true)}>
                          {t('result.refine.selectAll')}
                        </Button>
                        <Button size="small" onClick={() => toggleAll(false)}>
                          {t('result.refine.deselectAll')}
                        </Button>
                        <span style={{ color: '#666' }}>
                          {t('result.refine.count', { n: selected.size })}
                        </span>
                        <Button
                          type="primary"
                          size="small"
                          disabled={selected.size === 0}
                          onClick={openConfirm}
                        >
                          {t('result.refine.confirmTitle', { n: selected.size })}
                        </Button>
                      </>
                    )}
                  </Space>
                )}
                {fields.length === 0 ? (
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
                )}
              </>
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

      <Modal
        open={modalOpen}
        title={t('result.refine.confirmTitle', { n: selectedNames.length })}
        onCancel={() => setModalOpen(false)}
        onOk={doRefine}
        confirmLoading={refining}
        okText={t('result.refine.confirmOk')}
        cancelText={t('common.cancel')}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message={t('result.refine.confirmBody')}
        />
        <Space wrap>
          {selectedNames.map((n) => (
            <Tag color="blue" key={n}>
              {n}
            </Tag>
          ))}
        </Space>
        {refining && (
          <div style={{ marginTop: 12, color: '#888' }}>{t('result.refine.submitting')}</div>
        )}
      </Modal>
    </>
  )
}