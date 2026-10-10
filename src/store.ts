/**
 * 会话 store：登录态用户、CSRF、工作空间 + 极简视图路由。
 * 全部为内存态；唯一持久化的是 i18n 语言偏好（i18n.ts 自己管）。
 */
import { reactive, ref } from 'vue';
import {
  fetchSession,
  loginWithDevId,
  loginWithLine,
  onUnauthorized,
  setCsrfToken,
  type AuthPayload,
  type User,
  type Workspace,
} from './api';

export const user = ref<User | null>(null);
export const workspaces = ref<Workspace[]>([]);
export const booted = ref(false); // 启动检查是否结束（无论成败）

export const currentWorkspace = ref<Workspace | null>(null);

export function applyAuth(payload: AuthPayload): void {
  user.value = payload.user;
  workspaces.value = payload.workspaces;
  setCsrfToken(payload.csrf_token);
  if (!currentWorkspace.value) {
    currentWorkspace.value =
      payload.workspaces.find((w) => w.workspace_type === 'PERSONAL') ?? payload.workspaces[0] ?? null;
  }
}

export async function refreshSession(): Promise<boolean> {
  try {
    const payload = await fetchSession();
    applyAuth(payload);
    return true;
  } catch {
    return false;
  }
}

export async function signInWithLine(idToken: string, language: 'th' | 'en'): Promise<void> {
  applyAuth(await loginWithLine(idToken, language));
}

export async function signInWithDevId(devId: string, language: 'th' | 'en'): Promise<void> {
  applyAuth(await loginWithDevId(devId, language));
}

export function signOutLocally(): void {
  user.value = null;
  workspaces.value = [];
  currentWorkspace.value = null;
  setCsrfToken(null);
}

// 401 → 清空本地态，App 回到登录页
onUnauthorized(signOutLocally);

export interface Route {
  name: 'scan' | 'history' | 'my' | 'confirm' | 'settings' | 'processing' | 'result';
  /** 各子页参数，如 { fileId } / { jobId } */
  params?: Record<string, string>;
}

export const route = reactive<Route>({ name: 'scan' });

export function navigate(name: Route['name'], params?: Record<string, string>): void {
  route.name = name;
  route.params = params;
}

export function goTab(name: 'scan' | 'history' | 'my'): void {
  navigate(name);
}

// 启动流程：先尝试用既有 Cookie 恢复会话
export async function boot(): Promise<void> {
  if (booted.value) return;
  await refreshSession();
  booted.value = true;
}
