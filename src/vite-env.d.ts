/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 开发免登录开关：'true' 时启动未登录自动用 VITE_DEV_LOGIN_ID 建会话（仅 vite dev，后端需 AUTH_DEV_MODE=1） */
  readonly VITE_AUTO_DEV_LOGIN?: string;
  /** 免登录使用的开发身份（默认 demo-user） */
  readonly VITE_DEV_LOGIN_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
