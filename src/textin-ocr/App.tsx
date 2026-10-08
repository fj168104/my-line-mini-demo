import { useState } from 'react'
import { Card, ConfigProvider, Layout, Space, Typography } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import ExtractForm from './components/ExtractForm'
import ResultPanel from './components/ResultPanel'
import HistoryList from './components/HistoryList'
import type { ExtractResponse } from './types/ocr'

const { Header, Content } = Layout
const { Title } = Typography

export default function App() {
  const [current, setCurrent] = useState<ExtractResponse | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <ConfigProvider locale={zhCN}>
      <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
        <Header style={{ background: '#001529', display: 'flex', alignItems: 'center' }}>
          <Title level={3} style={{ color: '#fff', margin: 0 }}>
            SaiFlow OCR — 智能抽取
          </Title>
        </Header>
        <Content style={{ padding: 24 }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card title="1. 上传 / 提交">
              <ExtractForm
                onSuccess={(r) => setCurrent(r)}
                onHistoryRefresh={() => setRefreshKey((k) => k + 1)}
              />
            </Card>
            <Card title="2. 抽取结果">
              <ResultPanel record={current} />
            </Card>
            <Card title="3. 历史记录">
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
