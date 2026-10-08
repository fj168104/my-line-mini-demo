import { useState } from 'react'
import {
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Tabs,
  Upload,
  message,
} from 'antd'
import type { UploadFile } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import { extractOCR, type ExtractParams } from '../api/ocr'
import type { ExtractResponse } from '../types/ocr'
import FilePreview from './FilePreview'

interface Props {
  onSuccess: (record: ExtractResponse) => void
  onHistoryRefresh: () => void
}

const PARSE_MODES = [
  { value: 'scan', label: 'scan（精准识别）' },
  { value: 'layout', label: 'layout（版面分析）' },
  { value: 'article', label: 'article（文章模式）' },
]

export default function ExtractForm({ onSuccess, onHistoryRefresh }: Props) {
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

  const submit = async () => {
    if (tab === 'file' && fileList.length === 0) {
      message.warning('请先选择文件')
      return
    }
    if (tab === 'url' && !urlValue.trim()) {
      message.warning('请输入 URL')
      return
    }
    setLoading(true)
    try {
      const merged: ExtractParams = {
        ...params,
        field_names: fieldNames.length > 0 ? fieldNames : undefined,
      }
      const args =
        tab === 'file'
          ? { source_type: 'file' as const, file: fileList[0].originFileObj as File, params: merged }
          : { source_type: 'url' as const, url: urlValue.trim(), params: merged }
      const result = await extractOCR(args)
      message.success(`抽取完成：extraction_id=${result.extraction_id.slice(0, 8)}…`)
      onSuccess(result)
      onHistoryRefresh()
      setFileList([])
      setUrlValue('')
    } catch (e: unknown) {
      const err = e as { code?: number | string; message?: string }
      message.error(`${err.code ?? 'error'}: ${err.message ?? '未知错误'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Tabs
        activeKey={tab}
        onChange={(k) => setTab(k as 'file' | 'url')}
        items={[
          {
            key: 'file',
            label: '本地上传',
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
                  <p className="ant-upload-text">点击或拖拽文件到此区域</p>
                  <p className="ant-upload-hint">支持 JPG / PNG / PDF，单文件 ≤ 20MB</p>
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
            label: 'URL 输入',
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

      <Form layout="inline" size="small">
        <Form.Item label="解析模式">
          <Select
            style={{ width: 180 }}
            value={params.parse_mode}
            onChange={(v) => setParams({ ...params, parse_mode: v })}
            options={PARSE_MODES}
          />
        </Form.Item>
        <Form.Item label="表格识别">
          <Switch
            checked={params.table}
            onChange={(v) => setParams({ ...params, table: v })}
          />
        </Form.Item>
        <Form.Item label="公式识别">
          <Switch
            checked={params.formula}
            onChange={(v) => setParams({ ...params, formula: v })}
          />
        </Form.Item>
        <Form.Item label="旋转校正">
          <Switch
            checked={params.rotate}
            onChange={(v) => setParams({ ...params, rotate: v })}
          />
        </Form.Item>
        <Form.Item label="起始页">
          <InputNumber
            min={0}
            value={params.page}
            onChange={(v) => setParams({ ...params, page: v ?? undefined })}
          />
        </Form.Item>
        <Form.Item label="识别页数">
          <InputNumber
            min={1}
            value={params.page_count}
            onChange={(v) => setParams({ ...params, page_count: v ?? undefined })}
          />
        </Form.Item>
        <Form.Item label="我要抽取的字段" tooltip="回车确认；留空则使用启发式提取（准确度较低）">
          <Select
            mode="tags"
            style={{ minWidth: 280 }}
            placeholder="例如：发票号、金额、日期"
            value={fieldNames}
            onChange={(v) => setFieldNames(v ?? [])}
            tokenSeparators={[',', '，', ' ']}
            maxTagCount={20}
          />
        </Form.Item>
      </Form>

      <Button type="primary" loading={loading} onClick={submit} size="large">
        开始抽取
      </Button>
    </Space>
  )
}
