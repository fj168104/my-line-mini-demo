/** 与后端 textin/schemas.py 对齐的 TypeScript 类型。 */

export type SourceType = 'file' | 'url'

/** 后端落盘记录状态：
 *  - success: 同步抽取完成
 *  - pending / in_progress: 异步任务未完成
 *  - completed: 异步任务完成（终态）
 *  - failed: 异步任务失败（终态）
 */
export type ExtractionStatus =
  | 'success'
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'

export interface ExtractSummary {
  page_count: number
  item_count: number
  duration_ms: number | null
  field_count: number
}

export interface ExtractedField {
  page_number: number
  name: string
  value: string
  source: 'table' | 'markdown' | 'schema'
}

export interface ExtractResponse {
  extraction_id: string
  source_type: SourceType
  source_ref: string
  summary: ExtractSummary
  full_result: TextInResponse
  fields: ExtractedField[]
}

export interface ExtractionListItem {
  extraction_id: string
  source_type: SourceType
  source_ref: string
  created_at: string
  page_count: number
  item_count: number
  field_count: number
  status: ExtractionStatus
}

export interface ExtractionRecord {
  extraction_id: string
  source_type: SourceType
  source_ref: string
  created_at: string
  params: Record<string, unknown>
  textin_response: TextInResponse
  fields: ExtractedField[]
  status: ExtractionStatus
  async_job_id: string | null
}

/** POST /api/v1/ocr/async/extract 的成功响应。 */
export interface AsyncSubmitResponse {
  extraction_id: string
  job_id: string
  status: 'pending'
}

/** GET /api/v1/ocr/async/extractions/{id}/status 的成功响应。
 *  record 仅在 status === 'completed' 时填充。 */
export interface AsyncStatusResponse {
  status: ExtractionStatus
  record?: ExtractionRecord
  message?: string
}

/* TextIn xparse/parse/sync 响应（已被后端把 data.* 提升到顶层） */
export interface TextInElement {
  element_id?: string
  type?: string
  page_number?: number
  text?: string
  coordinates?: number[]
  metadata?: Record<string, unknown>
}

export interface TextInPage {
  page_number?: number
}

export interface TextInMetadata {
  page_count?: number
  filename?: string
  filetype?: string
  [k: string]: unknown
}

export interface TextInResponse {
  code: number
  message?: string
  elements?: TextInElement[]
  pages?: TextInPage[]
  metadata?: TextInMetadata
  markdown?: string
  file_id?: string
  job_id?: string
  summary?: Record<string, unknown>
  title_tree?: unknown
  [k: string]: unknown
}

/** 后端 Flask 统一响应信封 { code, msg, data }。 */
export interface ApiEnvelope<T = unknown> {
  code: number
  msg: string
  data: T
}

/** 抛给上层 UI 的业务错误（401 等场景）。 */
export interface ApiError {
  code: number | string
  message: string
  http_status?: number
}
