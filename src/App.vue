<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { boot, user, route } from './store';
import { initLiff } from './liff';
import { getLocale } from './i18n';
import { useT } from './i18nVue';
import { signInWithDevId, signInWithLine } from './store';
import LoginPage from './views/LoginPage.vue';
import ScanHomePage from './views/ScanHomePage.vue';
import HistoryPage from './views/HistoryPage.vue';
import MyPage from './views/MyPage.vue';
import ConfirmPage from './views/ConfirmPage.vue';
import SettingsPage from './views/SettingsPage.vue';
import ProcessingPage from './views/ProcessingPage.vue';
import ResultPage from './views/ResultPage.vue';

const { t } = useT();

type Phase = 'splash' | 'login' | 'app';
const phase = ref<Phase>('splash');
const bootError = ref('');

onMounted(async () => {
  // 1) LINE 内：用 ID token 直接建会话
  try {
    const liffState = await initLiff();
    if (liffState.idToken) {
      await signInWithLine(liffState.idToken, getLocale());
      phase.value = 'app';
      return;
    }
  } catch {
    /* LIFF 不可用则走 Cookie 恢复/登录页 */
  }
  // 2) 桌面/外部浏览器：先尝试既有 Cookie 会话
  try {
    await boot();
  } catch (e) {
    bootError.value = e instanceof Error ? e.message : String(e);
  }
  if (user.value) {
    phase.value = 'app';
    return;
  }
  // 3) 开发免登录（.env.development VITE_AUTO_DEV_LOGIN=true；后端仍需 AUTH_DEV_MODE=1，生产构建不生效）
  if (import.meta.env.DEV && import.meta.env.VITE_AUTO_DEV_LOGIN === 'true') {
    try {
      await signInWithDevId(import.meta.env.VITE_DEV_LOGIN_ID || 'demo-user', getLocale());
      phase.value = 'app';
      return;
    } catch {
      /* 后端未开 AUTH_DEV_MODE 时落到登录页 */
    }
  }
  phase.value = 'login';
});

// 401 / 登出 → 回登录页
watch(user, (u) => {
  if (!u && phase.value === 'app') {
    phase.value = 'login';
  }
});

function onLoggedIn() {
  bootError.value = '';
  phase.value = 'app';
}

const TABS = [
  { name: 'scan' as const, key: 'nav.scan', icon: 'scan' },
  { name: 'history' as const, key: 'nav.history', icon: 'history' },
  { name: 'my' as const, key: 'nav.my', icon: 'user' },
];
</script>

<template>
  <!-- P01 启动页 -->
  <div v-if="phase === 'splash'" class="splash">
    <div class="splash-logo">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx="10" fill="#4A66F7" />
        <path d="M12 27V13h11" stroke="#fff" stroke-width="3.4" stroke-linecap="round" />
        <path d="M12 20h8" stroke="#fff" stroke-width="3.4" stroke-linecap="round" />
        <circle cx="27.5" cy="26.5" r="2.5" fill="#fff" />
      </svg>
    </div>
    <div class="splash-name">saiflow</div>
    <div class="splash-tagline">Scan. Verify. Export.</div>
    <div class="splash-spinner" aria-hidden="true" />
    <div class="splash-connecting">{{ t('boot.connecting') }}</div>
    <div class="splash-powered">{{ t('boot.poweredBy') }}</div>
  </div>

  <LoginPage v-else-if="phase === 'login'" :notice="bootError" @logged-in="onLoggedIn" />

  <!-- 主壳：430px 手机框 + 底部导航 -->
  <div v-else class="phone">
    <main class="screen">
      <ScanHomePage v-if="route.name === 'scan'" />
      <HistoryPage v-else-if="route.name === 'history'" />
      <MyPage v-else-if="route.name === 'my'" />
      <ConfirmPage v-else-if="route.name === 'confirm'" :file-id="route.params?.fileId ?? ''" />
      <SettingsPage v-else-if="route.name === 'settings'" :file-id="route.params?.fileId ?? ''" />
      <ProcessingPage v-else-if="route.name === 'processing'" :job-id="route.params?.jobId ?? ''" />
      <ResultPage v-else-if="route.name === 'result'" :job-id="route.params?.jobId ?? ''" />
    </main>

    <nav v-if="route.name === 'scan' || route.name === 'history' || route.name === 'my'" class="bottom-nav">
      <button
        v-for="tab in TABS"
        :key="tab.name"
        class="nav-item"
        :class="{ active: route.name === tab.name }"
        @click="route.name = tab.name"
      >
        <svg
          v-if="tab.icon === 'scan'"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
          <line x1="7" y1="12" x2="17" y2="12" />
        </svg>
        <svg
          v-else-if="tab.icon === 'history'"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" />
          <path d="M3 3v5h5" />
          <path d="M12 7v5l3.5 2" />
        </svg>
        <svg
          v-else
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
        </svg>
        <span>{{ t(tab.key) }}</span>
      </button>
    </nav>
  </div>
</template>

<style>
:root {
  --primary: #4a66f7;
  --primary-light: #e8edff;
  --bg: #f5f7fa;
  --card: #ffffff;
  --border: #e3e8f0;
  --text: #171a1c;
  --text-secondary: #99a1b0;
  --icon: #596170;
  --success-bg: #e3f5ed;
  --success: #1f9e6b;
  --processing-bg: #fcf2e3;
  --processing: #d98f1f;
  --danger: #e6474d;
  --track: #edf2f7;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans Thai', 'Sarabun', sans-serif;
  background: #e9edf3;
  color: var(--text);
}

button {
  font-family: inherit;
  cursor: pointer;
  border: none;
  background: none;
  padding: 0;
}

#app {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ---- P01 启动页 ---- */
.splash {
  width: 100%;
  min-height: 100dvh;
  max-width: 430px;
  background: linear-gradient(160deg, #5a76ff 0%, #4a66f7 55%, #3a55e0 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  gap: 10px;
}

.splash-logo svg {
  border-radius: 22px;
  box-shadow: 0 12px 32px rgba(23, 26, 28, 0.25);
}

.splash-name {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 0.5px;
  margin-top: 8px;
}

.splash-tagline {
  font-size: 12px;
  opacity: 0.85;
}

.splash-spinner {
  width: 22px;
  height: 22px;
  margin-top: 36px;
  border: 3px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}

.splash-connecting {
  font-size: 12px;
  opacity: 0.9;
}

.splash-powered {
  position: absolute;
  bottom: 32px;
  font-size: 10px;
  opacity: 0.6;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ---- 手机壳 ---- */
.phone {
  width: 430px;
  max-width: 100vw;
  height: 100dvh;
  max-height: 940px;
  background: var(--bg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

@media (min-width: 480px) {
  .phone {
    border-radius: 28px;
    box-shadow: 0 24px 64px rgba(23, 26, 28, 0.18);
    border: 1px solid var(--border);
    height: 92dvh;
  }
}

.screen {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

/* ---- 底部导航 ---- */
.bottom-nav {
  height: 68px;
  background: var(--card);
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 0 24px;
  flex-shrink: 0;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  color: var(--icon);
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.6px;
  padding: 6px 14px;
  border-radius: 999px;
}

.nav-item.active {
  background: var(--primary);
  color: #fff;
}
</style>
