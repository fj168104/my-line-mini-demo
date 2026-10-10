import { useState } from 'react'
import { Card, ConfigProvider, Layout, Space, Typography } from 'antd'
import enUS from 'antd/locale/en_US'
import thTH from 'antd/locale/th_TH'
import 'dayjs/locale/th'
import ExtractForm from './components/ExtractForm'
import ResultPanel from './components/ResultPanel'
import HistoryList from './components/HistoryList'
import { useI18n } from './i18n'
import type { TextinOcrMode } from './mount'
import type { ExtractionRecord, ExtractResponse, ExtractSummary } from './types/ocr'

function recordToResponse(rec: ExtractionRecord): ExtractResponse {
  const textin = rec.textin_response || {}
  const metadata = (textin.metadata || {}) as { page_count?: number }
  const pages = (textin.pages || []) as unknown[]
  const elements = (textin.elements || []) as unknown[]
  const summary: ExtractSummary = {
    page_count: metadata.page_count ?? pages.length ?? 1,
    item_count: elements.length,
    duration_ms: null,
    field_count: rec.fields.length,
  }
  return {
    extraction_id: rec.extraction_id,
    source_type: rec.source_type,
    source_ref: rec.source_ref,
    summary,
    full_result: textin as ExtractResponse['full_result'],
    fields: rec.fields,
  }
}

const { Header, Content } = Layout
const { Title } = Typography

interface Props {
  mode?: TextinOcrMode
}

export default function App({ mode = 'sync' }: Props) {
  const { t, locale } = useI18n()
  const [current, setCurrent] = useState<ExtractResponse | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <ConfigProvider locale={locale === 'th' ? thTH : enUS}>
      <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
        <Header style={{ background: '#001529', display: 'flex', alignItems: 'center' }}>
          <Title level={3} style={{ color: '#fff', margin: 0 }}>
            {mode === 'async' ? t('app.headerTitleAsync') : t('app.headerTitle')}
          </Title>
        </Header>
        <Content style={{ padding: 24 }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card title={mode === 'async' ? t('app.cardUploadAsync') : t('app.cardUpload')}>
              <ExtractForm
                mode={mode}
                onSuccess={(r) => setCurrent(r)}
                onHistoryRefresh={() => setRefreshKey((k) => k + 1)}
              />
            </Card>
            <Card title={t('app.cardResult')}>
              <ResultPanel
                record={current}
                onRefined={(r) => setCurrent(recordToResponse(r))}
              />
            </Card>
            <Card title={t('app.cardHistory')}>
              <HistoryList
                refreshKey={refreshKey}
                onSelect={(r) =>
                  setCurrent({
                    extraction_id: r.extraction_id,
                    source_type: r.source_type,
                    source_ref: r.source_ref,
                    summary: r.summary,
                    full_result: r.full_result as ExtractResponse['full_result'],
                    fields: r.fields,
                  })
                }
              />
            </Card>
          </Space>
        </Content>
      </Layout>
    </ConfigProvider>
  )
}
