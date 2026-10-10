/**
 * LINE LIFF 接入：初始化并取 ID token。
 * 桌面浏览器等 LIFF 不可用环境下返回 liffReady=false，
 * 由调用方降级到开发登录（后端 AUTH_DEV_MODE 兜底）。
 */
import liff from '@line/liff';

export interface LiffState {
  isInLine: boolean;
  idToken: string | null;
  /** LIFF 初始化成功但尚未登录：仅此时允许点击跳转 LINE 登录 */
  loginAvailable: boolean;
  /** 配置了 VITE_LIFF_ID 但 liff.init 失败（如 LINE CDN 超时）：可重试 */
  initFailed: boolean;
}

let initPromise: Promise<LiffState> | null = null;

export function initLiff(): Promise<LiffState> {
  if (!initPromise) {
    initPromise = (async () => {
      const liffId = import.meta.env.VITE_LIFF_ID as string | undefined;
      if (!liffId) {
        return { isInLine: false, idToken: null, loginAvailable: false, initFailed: false };
      }
      try {
        await liff.init({ liffId });
        if (!liff.isLoggedIn()) {
          // 不自动跳转：桌面浏览器会因此被打断，登录页应保留开发兜底入口
          return { isInLine: true, idToken: null, loginAvailable: true, initFailed: false };
        }
        const idToken = liff.getIDToken();
        return { isInLine: true, idToken: idToken || null, loginAvailable: false, initFailed: false };
      } catch {
        // 失败（如 LINE CDN 超时）不缓存，下次点击自动重试
        initPromise = null;
        return { isInLine: false, idToken: null, loginAvailable: false, initFailed: true };
      }
    })();
  }
  return initPromise;
}

/** 跳转 LINE 登录（仅在用户点击 LINE 登录按钮后调用；回跳当前页） */
export function redirectToLineLogin(): void {
  liff.login({ redirectUri: window.location.href });
}

/** LINE 内关闭窗口（如不可用则忽略） */
export function closeLiffWindow(): void {
  try {
    if (liff.isInClient()) liff.closeWindow();
  } catch {
    /* ignore */
  }
}
