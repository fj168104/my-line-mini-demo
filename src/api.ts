// 后端 API 封装：登录 / 获取用户信息 / 登出
// 通过 Vite 代理，/api/* 转发到 Flask 后端 (http://localhost:5000)

const API_BASE = '/api';
const TOKEN_KEY = 'user_token';

export interface UserInfo {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

interface ApiResponse<T = unknown> {
  code: number;
  msg: string;
  data?: T;
}

/** 取本地存储的 token */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/** 保存 token */
function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/** 清除 token */
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** 统一请求封装：自动带 token、处理业务错误码 */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const body: ApiResponse<T> = await res.json().catch(() => ({} as ApiResponse<T>));
  // 401：未登录/凭证错误/token 失效。统一清除本地 token，并展示后端真实消息
  if (res.status === 401) {
    clearToken();
    throw new Error(body.msg || '未登录或登录已过期');
  }
  // 接受所有 2xx（注册接口成功码为 201）
  if (!res.ok || !(body.code >= 200 && body.code < 300)) {
    throw new Error(body.msg || `请求失败 (HTTP ${res.status})`);
  }
  return (body.data ?? ({} as T));
}

/** 注册：成功后后端返回新用户信息（不返回 token，需再登录） */
export async function register(
  username: string,
  email: string,
  password: string,
): Promise<UserInfo> {
  return request<UserInfo>('/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
}

/** 登录：返回 token + 用户信息 */
export async function login(account: string, password: string): Promise<{ token: string; user: UserInfo }> {
  const data = await request<{ token: string; user: UserInfo }>(
    '/login',
    {
      method: 'POST',
      body: JSON.stringify({ account, password }),
    },
  );
  setToken(data.token);
  return data;
}

/** 获取当前登录用户信息（需 token） */
export function getUserInfo(): Promise<UserInfo> {
  return request<UserInfo>('/user');
}

/** 登出（需 token）：后端删除 Redis 中的 token */
export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken() ?? ''}` },
    });
  } finally {
    // 无论后端响应如何，都清除本地 token
    clearToken();
  }
}

// ===== OCR 识别 =====

export interface OcrVertex {
  x: number;
  y: number;
}

export interface OcrBlock {
  text: string;
  vertices: OcrVertex[];
  confidence: number;
}

export interface OcrResult {
  image_url: string;
  image_width: number;
  image_height: number;
  full_text: string;
  blocks: OcrBlock[];
}

/** 上传图片做 OCR 识别（需登录） */
export async function recognizeImage(file: File): Promise<OcrResult> {
  const token = getToken();
  if (!token) {
    throw new Error('请先登录');
  }
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${API_BASE}/ocr`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    // 注意：FormData 不要手动设 Content-Type，浏览器会自动带 boundary
    body: form,
  });
  const body: ApiResponse<OcrResult> = await res.json().catch(() => ({} as ApiResponse<OcrResult>));
  if (res.status === 401) {
    clearToken();
    throw new Error(body.msg || '未登录或登录已过期');
  }
  if (!res.ok || !(body.code >= 200 && body.code < 300)) {
    throw new Error(body.msg || `识别失败 (HTTP ${res.status})`);
  }
  return body.data as OcrResult;
}

/** 取得上传图片的完整 URL（代理后为 /api/uploads/xxx） */
export function uploadImageUrl(path: string): string {
  // 后端返回的 image_url 形如 /uploads/xxx.png，前端经代理访问 /api/uploads/xxx.png
  return `${API_BASE}${path}`;
}

