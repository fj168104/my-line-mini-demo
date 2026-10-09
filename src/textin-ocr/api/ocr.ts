import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { t } from '../../i18n'
import type {
  ApiEnvelope,
  ApiError,
  ExtractionListItem,
  ExtractionRecord,
  ExtractResponse,
} from '../types/ocr'

/**
 * TextIn OCR 后端基础路径。
 * 浏览器请求 /api/v1/ocr/* —— 与 Vue 主应用相同的 /api 代理规则，
 * 开发期 Vite 透传、生产期 Nginx proxy_pass 透传到 Flask 后端。
 */
const API_BASE = import.meta.env.VITE_TEXTIN_API_BASE || '/api/v1/ocr'

/** Vue 主应用的 token 键名（见 src/api.ts:TOKEN_KEY）。 */
const TOKEN_KEY = 'user_token'

/** 401 时广播的窗口事件，Vue 端 App.vue 监听后会触发 handleLogout()。 */
const UNAUTHORIZED_EVENT = 'app:unauthorized'

const http = axios.create({
  baseURL: API_BASE,
  timeout: 120_000,
})

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

http.interceptors.response.use(
  (resp) => resp,
  (err: AxiosError<ApiEnvelope<unknown>>) => {
    if (err.response?.status === 401) {
      // 清理本地 token 并通知 Vue 主应用退出登录
      localStorage.removeItem(TOKEN_KEY)
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT))
    }
    return Promise.reject(err)
  },
)

export interface ExtractParams {
  parse_mode?: string
  table?: boolean
  formula?: boolean
  rotate?: boolean
  page?: number
  page_count?: number
  field_names?: string[]
}

export interface ExtractFromFileArgs {
  source_type: 'file'
  file: File
  params?: ExtractParams
}

export interface ExtractFromUrlArgs {
  source_type: 'url'
  url: string
  params?: ExtractParams
}

export type ExtractArgs = ExtractFromFileArgs | ExtractFromUrlArgs

function _unwrapError(e: unknown): ApiError {
  const err = e as AxiosError<ApiEnvelope<unknown>>
  // Flask 信封：{code, msg, data:null}
  const envelope = err.response?.data
  if (envelope && typeof envelope === 'object' && 'msg' in envelope) {
    return {
      code: envelope.code ?? err.response?.status ?? 'unknown',
      message: envelope.msg || err.message || t('api.requestFailed'),
      http_status: err.response?.status,
    }
  }
  if (err.message) {
    return {
      code: err.response?.status ?? 'network_error',
      message: err.message,
      http_status: err.response?.status,
    }
  }
  return { code: 'unknown_error', message: String(e) }
}

function _unwrap<T>(envelope: ApiEnvelope<T> | undefined): T {
  if (!envelope) throw _unwrapError(new Error(t('api.emptyResponse')))
  if (envelope.code < 200 || envelope.code >= 300) {
    throw {
      code: envelope.code,
      message: envelope.msg || t('api.bizError', { code: envelope.code }),
    } satisfies ApiError
  }
  return envelope.data as T
}

export async function extractOCR(args: ExtractArgs): Promise<ExtractResponse> {
  const form = new FormData()
  form.append('source_type', args.source_type)
  const params = args.params || {}
  if (params.parse_mode) form.append('parse_mode', params.parse_mode)
  if (params.table !== undefined) form.append('table', String(params.table))
  if (params.formula !== undefined) form.append('formula', String(params.formula))
  if (params.rotate !== undefined) form.append('rotate', String(params.rotate))
  if (params.page !== undefined) form.append('page', String(params.page))
  if (params.page_count !== undefined)
    form.append('page_count', String(params.page_count))
  if (params.field_names) {
    for (const name of params.field_names) {
      const trimmed = name.trim()
      if (trimmed) form.append('field_names', trimmed)
    }
  }

  if (args.source_type === 'file') {
    form.append('file', args.file)
  } else {
    form.append('url', args.url)
  }

  try {
    const resp = await http.post<ApiEnvelope<ExtractResponse>>('/extract', form)
    return _unwrap(resp.data)
  } catch (e) {
    throw _unwrapError(e)
  }
}

export async function listExtractions(): Promise<ExtractionListItem[]> {
  try {
    const resp = await http.get<ApiEnvelope<ExtractionListItem[]>>('/extractions')
    return _unwrap(resp.data)
  } catch (e) {
    throw _unwrapError(e)
  }
}

export async function getExtraction(id: string): Promise<ExtractionRecord> {
  try {
    const resp = await http.get<ApiEnvelope<ExtractionRecord>>(`/extractions/${id}`)
    return _unwrap(resp.data)
  } catch (e) {
    throw _unwrapError(e)
  }
}

export function getExtractionFileUrl(id: string): string {
  const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE
  return `${base}/extractions/${id}/file`
}
