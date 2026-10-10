import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Spin,
  Switch,
  Tabs,
  Upload,
  message,
} from 'antd'
import type { UploadFile } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import {
  extractOCR,
  pollAsyncStatus,
  submitAsyncExtract,
  type ExtractParams,
} from '../api/ocr'
import type { TextinOcrMode } from '../mount'
import { useI18n } from '../i18n'
import type { ExtractResponse, ExtractionStatus } from '../types/ocr'
import FilePreview from './FilePreview'

interface Props {
  onSuccess: (record: ExtractResponse) => void
  onHistoryRefresh: () => void
  mode?: TextinOcrMode
}

const POLL_INTERVAL_MS = 2500
const POLL_MAX_ATTEMPTS = 120 // ~5 minutes

export default function ExtractForm({ onSuccess, onHistoryRefresh, mode = 'sync' }: Props) {
  const { t } = useI18n()
  const PARSE_MODES = [
    { value: 'scan', label: t('form.modeScan') },
    { value: 'layout', label: t('form.modeLayout') },
    { value: 'article', label: t('form.modeArticle') },
  ]
  const [tab, setTab] = useState<'file' | 'url'>('file')
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [urlValue, setUrlValue] = useState('')
  const [params, setParams] = useState<ExtractParams>({
    parse_mode: 'scan',
    table: true,
    formula: false,
    rotate: false,
  })
  const [fieldNames, setFieldNames] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [polling, setPolling] = useState(false)
  const [pollStatus, setPollStatus] = useState<ExtractionStatus | ''>('')
  const [pollAttempt, setPollAttempt] = useState(0)
  const pollTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (pollTimerRef.current !== null) {
        window.clearTimeout(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
  }, [])

  function stopPolling() {
    if (pollTimerRef.current !== null) {
      window.clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
    setPolling(false)
    setPollStatus('')
    setPollAttempt(0)
  }

  function scheduleNextPoll(extractionId: string, attempt: number) {
    pollTimerRef.current = window.setTimeout(async () => {
      try {
        const resp = await pollAsyncStatus(extractionId)
        setPollStatus(resp.status)
        setPollAttempt(attempt)
        if (resp.status === 'completed' && resp.record) {
          stopPolling()
          const rec = resp.record
          const result: ExtractResponse = {
            extraction_id: rec.extraction_id,
            source_type: rec.source_type,
            source_ref: rec.source_ref,
            summary: {
              page_count: rec.textin_response?.metadata?.page_count ?? rec.textin_response?.pages?.length ?? 1,
              item_count: (rec.textin_response?.elements ?? []).length,
              duration_ms: null,
              field_count: rec.fields?.length ?? 0,
            },
            full_result: rec.textin_response,
            fields: rec.fields ?? [],
          }
          message.success(t('form.asyncDone', { id: rec.extraction_id.slice(0, 8) }))
          onSuccess(result)
          onHistoryRefresh()
          setFileList([])
        } else if (resp.status === 'failed') {
          stopPolling()
          message.error(t('form.asyncFailed', { msg: resp.message ?? t('common.unknownError') }))
        } else if (attempt >= POLL_MAX_ATTEMPTS) {
          stopPolling()
          message.warning(t('form.asyncTimeout'))
        } else {
          scheduleNextPoll(extractionId, attempt + 1)
        }
      } catch (e: unknown) {
        const err = e as { message?: string }
        stopPolling()
        message.error(`${err.message ?? t('common.unknownError')}`)
      }
    }, POLL_INTERVAL_MS)
  }

  const submit = async () => {
    if (tab === 'file' && fileList.length === 0) {
      message.warning(t('form.warnSelectFile'))
      return
    }
    if (tab === 'url' && !urlValue.trim()) {
      message.warning(t('form.warnInputUrl'))
      return
    }
    setLoading(true)
    try {
      if (mode === 'async') {
        if (tab !== 'file') {
          message.warning(t('form.warnSelectFile'))
          setLoading(false)
          return
        }
        const merged = { ...params }
        message.loading({ content: t('form.asyncSubmitting'), key: 'async-submit' })
        const submitResp = await submitAsyncExtract({
          file: fileList[0].originFileObj as File,
          params: merged,
        })
        message.destroy('async-submit')
        setPolling(true)
        setPollStatus('pending')
        setPollAttempt(1)
        scheduleNextPoll(submitResp.extraction_id, 2)
      } else {
        const merged: ExtractParams = {
          ...params,
          field_names: fieldNames.length > 0 ? fieldNames : undefined,
        }
        const args =
          tab === 'file'
            ? { source_type: 'file' as const, file: fileList[0].originFileObj as File, params: merged }
            : { source_type: 'url' as const, url: urlValue.trim(), params: merged }
        const result = await extractOCR(args)
        message.success(t('form.done', { id: result.extraction_id.slice(0, 8) }))
        onSuccess(result)
        onHistoryRefresh()
        setFileList([])
        setUrlValue('')
      }
    } catch (e: unknown) {
      const err = e as { code?: number | string; message?: string }
      message.error(`${err.code ?? 'error'}: ${err.message ?? t('common.unknownError')}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {mode === 'async' && (
        <Alert
          type="info"
          showIcon
          message={t('form.noFieldsAsync')}
          style={{ marginBottom: 0 }}
        />
      )}

      {mode === 'async' ? (
        <>
          <Upload.Dragger
            multiple={false}
            beforeUpload={() => false}
            fileList={fileList}
            onChange={({ fileList: fl }) => setFileList(fl)}
            accept="image/*,.pdf"
            maxCount={1}
            disabled={polling}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">{t('form.dropText')}</p>
            <p className="ant-upload-hint">{t('form.dropHint')}</p>
          </Upload.Dragger>
          {fileList.length > 0 && fileList[0].originFileObj && (
            <div style={{ marginTop: 12 }}>
              <FilePreview file={fileList[0].originFileObj as File} />
            </div>
          )}
        </>
      ) : (
        <Tabs
          activeKey={tab}
          onChange={(k) => setTab(k as 'file' | 'url')}
          items={[
            {
              key: 'file',
              label: t('form.tabFile'),
              children: (
                <>
                  <Upload.Dragger
                    multiple={false}
                    beforeUpload={() => false}
                    fileList={fileList}
                    onChange={({ fileList: fl }) => setFileList(fl)}
                    accept="image/*,.pdf"
                    maxCount={1}
                  >
                    <p className="ant-upload-drag-icon">
                      <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">{t('form.dropText')}</p>
                    <p className="ant-upload-hint">{t('form.dropHint')}</p>
                  </Upload.Dragger>
                  {fileList.length > 0 && fileList[0].originFileObj && (
                    <div style={{ marginTop: 12 }}>
                      <FilePreview file={fileList[0].originFileObj as File} />
                    </div>
                  )}
                </>
              ),
            },
            {
              key: 'url',
              label: t('form.tabUrl'),
              children: (
                <Input
                  placeholder="https://example.com/sample.jpg"
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                  allowClear
                  size="large"
                />
              ),
            },
          ]}
        />
      )}

      <Form layout="inline" size="small">
        <Form.Item label={t('form.parseMode')}>
          <Select
            style={{ width: 180 }}
            value={params.parse_mode}
            onChange={(v) => setParams({ ...params, parse_mode: v })}
            options={PARSE_MODES}
          />
        </Form.Item>
        <Form.Item label={t('form.table')}>
          <Switch
            checked={params.table}
            onChange={(v) => setParams({ ...params, table: v })}
          />
        </Form.Item>
        <Form.Item label={t('form.formula')}>
          <Switch
            checked={params.formula}
            onChange={(v) => setParams({ ...params, formula: v })}
          />
        </Form.Item>
        <Form.Item label={t('form.rotate')}>
          <Switch
            checked={params.rotate}
            onChange={(v) => setParams({ ...params, rotate: v })}
          />
        </Form.Item>
        <Form.Item label={t('form.startPage')}>
          <InputNumber
            min={0}
            value={params.page}
            onChange={(v) => setParams({ ...params, page: v ?? undefined })}
          />
        </Form.Item>
        <Form.Item label={t('form.pageCount')}>
          <InputNumber
            min={1}
            value={params.page_count}
            onChange={(v) => setParams({ ...params, page_count: v ?? undefined })}
          />
        </Form.Item>
        {mode === 'sync' && (
          <Form.Item label={t('form.fields')} tooltip={t('form.fieldsTooltip')}>
            <Select
              mode="tags"
              style={{ minWidth: 280 }}
              placeholder={t('form.fieldsPh')}
              value={fieldNames}
              onChange={(v) => setFieldNames(v ?? [])}
              tokenSeparators={[',', '，', ' ']}
              maxTagCount={20}
            />
          </Form.Item>
        )}
      </Form>

      {polling && (
        <Alert
          type="info"
          showIcon
          icon={<Spin size="small" />}
          message={t('form.asyncPolling', {
            attempt: pollAttempt,
            max: POLL_MAX_ATTEMPTS,
            status: pollStatus,
          })}
        />
      )}

      <Space>
        <Button type="primary" loading={loading || polling} onClick={submit} size="large">
          {mode === 'async' ? t('form.startAsync') : t('form.start')}
        </Button>
        {polling && (
          <Button onClick={stopPolling} size="large">
            {t('common.cancel')}
          </Button>
        )}
      </Space>
    </Space>
  )
}
