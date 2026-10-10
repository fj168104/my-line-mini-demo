/**
 * saiflow v1 API client.
 *
 * 约定（PRD §14）：
 * - 会话是 HttpOnly Cookie（saiflow_session，Path=/api），前端不持有、不存储任何长期凭证；
 * - 成功响应统一为 { code: "OK", data }；错误为扁平的 { code, message_key, request_id, retryable, field_errors }；
 * - 所有写请求必须携带 X-CSRF-Token（登录或 GET /auth/session 时下发，仅存内存）；
 * - 401 触发 onUnauthorized 订阅者（App 回到登录态），绝不把凭证写进 URL/localStorage。
 */

const API_BASE = '/api/v1';

export interface ApiFieldError {
  field?: string;
  reason?: string;
  message_key?: string;
}

export interface ApiErrorBody {
  code: string;
  message_key: string;
  request_id: string;
  retryable: boolean;
  field_errors: ApiFieldError[];
}

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody;
  constructor(status: number, body: ApiErrorBody) {
    super(body.message_key || `HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
  get messageKey(): string {
    return this.body.message_key;
  }
}

let csrfToken: string | null = null;

/** 登录 / 会话刷新时由调用方注入；登出时清空 */
export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

/** 401 通知（App 用来回到登录页） */
export function onUnauthorized(fn: UnauthorizedListener): () => void {
  unauthorizedListeners.add(fn);
  return () => {
    unauthorizedListeners.delete(fn);
  };
}

function emitUnauthorized(): void {
  csrfToken = null;
  unauthorizedListeners.forEach((fn) => fn());
}

interface RequestOptions {
  method?: string;
  json?: unknown;
  rawBody?: BodyInit;
  contentType?: string;
  headers?: Record<string, string>;
  idempotencyKey?: string;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', json, rawBody, contentType, headers = {}, idempotencyKey } = options;

  const h: Record<string, string> = { ...headers };
  const isWrite = method !== 'GET' && method !== 'HEAD';
  if (isWrite && csrfToken) {
    h['X-CSRF-Token'] = csrfToken;
  }
  if (idempotencyKey) {
    h['Idempotency-Key'] = idempotencyKey;
  }
  let body: BodyInit | undefined;
  if (json !== undefined) {
    h['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (rawBody !== undefined) {
    if (contentType) h['Content-Type'] = contentType;
    body = rawBody;
  }

  const res = await fetch(`${API_BASE}${path}`, { method, headers: h, body, credentials: 'same-origin' });

  if (res.status === 401) {
    emitUnauthorized();
    let body401: ApiErrorBody = {
      code: 'AUTH_REQUIRED',
      message_key: 'auth.login_required',
      request_id: '',
      retryable: false,
      field_errors: [],
    };
    try {
      body401 = { ...body401, ...(await res.json()) };
    } catch {
      /* 非 JSON 错误体 */
    }
    throw new ApiError(401, body401);
  }

  let payload: { code?: string; data?: T } & Partial<ApiErrorBody> = {};
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      /* 下载等二进制场景在上层处理，不会走到这里 */
    }
  }

  if (!res.ok || payload.code !== 'OK') {
    throw new ApiError(res.status, {
      code: payload.code ?? `HTTP_${res.status}`,
      message_key: payload.message_key ?? 'error.unknown',
      request_id: payload.request_id ?? '',
      retryable: payload.retryable ?? false,
      field_errors: payload.field_errors ?? [],
    });
  }
  return (payload.data ?? ({} as T));
}

// ---------- 类型 ----------

export interface User {
  id: number;
  display_name: string;
  avatar_url: string;
  language: 'th' | 'en';
  created_at: string;
}

export interface Workspace {
  workspace_type: 'PERSONAL' | 'ENTERPRISE';
  enterprise_id: number | null;
  enterprise_name: string | null;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | null;
}

export interface AuthPayload {
  user: User;
  csrf_token: string;
  workspaces: Workspace[];
}

export interface FileInfo {
  id: string;
  workspace_type: string;
  enterprise_id: number | null;
  original_name: string;
  mime_type: string;
  status: 'UPLOADING' | 'UPLOADED' | 'VALIDATING' | 'READY' | 'REJECTED';
  reject_reason: string;
  size_bytes: number;
  page_count: number;
  created_at: string;
}

export type JobStatus =
  | 'QUEUED'
  | 'PREPROCESSING'
  | 'PROCESSING'
  | 'POSTPROCESSING'
  | 'SUCCEEDED'
  | 'PARTIAL_SUCCESS'
  | 'FAILED'
  | 'CANCEL_REQUESTED'
  | 'CANCELLED';

export type ReviewStatus = 'UNREVIEWED' | 'EDITED' | 'CONFIRMED';

export interface JobSummary {
  id: string;
  file_id: string;
  file_name: string;
  workspace_type: string;
  enterprise_id: number | null;
  status: JobStatus;
  progress: number;
  review_status: ReviewStatus;
  page_count: number;
  table_count: number;
  field_count: number;
  error_code: string | null;
  parent_job_id: string | null;
  idempotency_key: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface JobList {
  items: JobSummary[];
  total: number;
  page: number;
  page_size: number;
}

export interface ResultCell {
  row_index: number;
  column_index: number;
  raw_text: string;
  current_text: string;
  review_status: 'UNREVIEWED' | 'EDITED' | 'CONFIRMED';
}

export interface ResultTable {
  table_id: string;
  row_count: number;
  column_count: number;
  cells: ResultCell[];
}

export interface ResultField {
  name: string;
  value: string;
  source?: string;
  source_page?: number;
}

export interface ResultPage {
  page_number: number;
  text: string;
  tables: ResultTable[];
  fields: ResultField[];
}

/** GET/PATCH /ocr/jobs/{id}/results：扁平负载，无嵌套 job */
export interface JobResults {
  job_id: string;
  version: number;
  review_status: ReviewStatus;
  page_count: number;
  table_count: number;
  field_count: number;
  missing_pages: number[];
  pages: ResultPage[];
}

export interface ExportInfo {
  id: string;
  job_id: string;
  format: 'XLSX' | 'CSV' | 'TXT';
  status: string;
  expires_at: string;
  created_at: string;
}

export interface WorkspacesPayload {
  workspaces: Workspace[];
  pending_applications: unknown[];
}

// ---------- 认证 ----------

export function loginWithLine(idToken: string, language: 'th' | 'en'): Promise<AuthPayload> {
  return request<AuthPayload>('/auth/line', { method: 'POST', json: { id_token: idToken, language } });
}

/** 开发兜底（后端 AUTH_DEV_MODE=1 时才可用；生产禁用） */
export function loginWithDevId(devId: string, language: 'th' | 'en'): Promise<AuthPayload> {
  return request<AuthPayload>('/auth/line', { method: 'POST', json: { dev_id: devId, language } });
}

export function fetchSession(): Promise<AuthPayload> {
  return request<AuthPayload>('/auth/session');
}

export async function logout(): Promise<void> {
  try {
    await request('/auth/logout', { method: 'POST' });
  } finally {
    setCsrfToken(null);
  }
}

// ---------- 上传（三段式） ----------

export function createUpload(
  fileName: string,
  sizeBytes: number,
  workspace?: { workspace_type?: string; enterprise_id?: number },
): Promise<{ file: FileInfo; upload_id: string }> {
  return request('/uploads', {
    method: 'POST',
    json: { file_name: fileName, size_bytes: sizeBytes, purpose: 'OCR_TASK', ...workspace },
  });
}

export function uploadContent(uploadId: string, data: Blob, contentType: string): Promise<void> {
  return request(`/uploads/${uploadId}/content`, {
    method: 'PUT',
    rawBody: data,
    contentType,
  });
}

export function completeUpload(uploadId: string): Promise<{ file: FileInfo }> {
  return request(`/uploads/${uploadId}/complete`, { method: 'POST' });
}

export function importFromUrl(
  url: string,
  workspace?: { workspace_type?: string; enterprise_id?: number },
): Promise<{ file: FileInfo }> {
  return request('/file-imports', { method: 'POST', json: { url, ...workspace } });
}

export function getFile(fileId: string): Promise<{ file: FileInfo }> {
  return request(`/files/${fileId}`);
}

/** 文件内容/预览走 cookie 鉴权的同源 URL，直接给 <img>/<a> 用 */
export function fileContentUrl(fileId: string): string {
  return `${API_BASE}/files/${fileId}/content`;
}
export function filePagePreviewUrl(fileId: string, page: number): string {
  return `${API_BASE}/files/${fileId}/pages/${page}/preview`;
}

// ---------- OCR 任务 ----------

export interface CreateJobInput {
  file_id: string;
  params?: {
    parse_mode?: 'scan' | 'layout' | 'article';
    table?: boolean;
    formula?: boolean;
    rotate?: boolean;
    page?: number;
    page_count?: number;
  };
  field_names?: string[];
  idempotency_key?: string;
}

export function createJob(input: CreateJobInput): Promise<JobSummary> {
  const { idempotency_key, ...json } = input;
  return request<JobSummary>('/ocr/jobs', {
    method: 'POST',
    json,
    idempotencyKey: idempotency_key,
  });
}

export function listJobs(query: { status?: string; page?: number; page_size?: number } = {}): Promise<JobList> {
  const qs = new URLSearchParams();
  if (query.status) qs.set('status', query.status);
  if (query.page) qs.set('page', String(query.page));
  if (query.page_size) qs.set('page_size', String(query.page_size));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return request<JobList>(`/ocr/jobs${suffix}`);
}

export function getJob(jobId: string): Promise<JobSummary> {
  return request<JobSummary>(`/ocr/jobs/${jobId}`);
}

export function cancelJob(jobId: string): Promise<JobSummary> {
  return request<JobSummary>(`/ocr/jobs/${jobId}/cancel`, { method: 'POST' });
}

export function rerunJob(jobId: string): Promise<JobSummary> {
  return request<JobSummary>(`/ocr/jobs/${jobId}/rerun`, { method: 'POST' });
}

export function deleteJob(jobId: string): Promise<{ id: string; results_deleted: boolean }> {
  return request(`/ocr/jobs/${jobId}`, { method: 'DELETE' });
}

// ---------- 结果与复核 ----------

export function getJobResults(jobId: string): Promise<JobResults> {
  return request<JobResults>(`/ocr/jobs/${jobId}/results`);
}

export interface CellEdit {
  page_number: number;
  table_id: string;
  row_index: number;
  column_index: number;
  current_text: string;
}

export function reviewCells(
  jobId: string,
  input: { expected_version: number; edits?: CellEdit[]; confirm?: boolean },
): Promise<JobResults> {
  return request<JobResults>(`/ocr/jobs/${jobId}/results`, { method: 'PATCH', json: input });
}

// ---------- 导出 ----------

export function createExport(jobId: string, format: 'XLSX' | 'CSV' | 'TXT'): Promise<ExportInfo> {
  return request<ExportInfo>(`/ocr/jobs/${jobId}/exports`, { method: 'POST', json: { format } });
}

export function getExport(exportId: string): Promise<ExportInfo> {
  return request<ExportInfo>(`/exports/${exportId}`);
}

export function exportDownloadUrl(exportId: string): string {
  return `${API_BASE}/exports/${exportId}/download`;
}
