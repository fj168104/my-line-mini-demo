<script setup lang="ts">
import { ref } from 'vue';
import { ApiError } from '../api';
import { getLocale, messageText, t } from '../i18n';
import { useT } from '../i18nVue';
import { initLiff, redirectToLineLogin } from '../liff';
import { signInWithDevId, signInWithLine } from '../store';

const { t: tt } = useT();

const isDev = import.meta.env.DEV;

const props = defineProps<{
  notice?: string;
}>();

const emit = defineEmits<{
  (e: 'logged-in'): void;
}>();

const errorMsg = ref(props.notice ? '' : '');
if (props.notice) {
  // 启动失败原因（如会话过期）以通用错误展示
  errorMsg.value = props.notice;
}

const lineLoading = ref(false);
const devId = ref('');
const devLoading = ref(false);

async function loginWithLine() {
  errorMsg.value = '';
  lineLoading.value = true;
  try {
    const state = await initLiff();
    if (state.idToken) {
      await signInWithLine(state.idToken, getLocale());
      emit('logged-in');
      return;
    }
    if (state.loginAvailable) {
      redirectToLineLogin(); // 用户显式点击后才跳转 LINE OAuth
      return;
    }
    // LIFF 不可用（未配置/初始化失败）——提示用开发登录
    errorMsg.value = t('err.auth.line_not_configured');
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? messageText(e.messageKey) : t('login.failed');
  } finally {
    lineLoading.value = false;
  }
}

async function loginWithDev() {
  const id = devId.value.trim();
  if (!id || devLoading.value) return;
  errorMsg.value = '';
  devLoading.value = true;
  try {
    await signInWithDevId(id, getLocale());
    emit('logged-in');
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? messageText(e.messageKey) : t('login.failed');
  } finally {
    devLoading.value = false;
  }
}
</script>

<template>
  <div class="login">
    <div class="login-logo">
      <svg width="48" height="48" viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx="10" fill="#4A66F7" />
        <path d="M12 27V13h11" stroke="#fff" stroke-width="3.4" stroke-linecap="round" />
        <path d="M12 20h8" stroke="#fff" stroke-width="3.4" stroke-linecap="round" />
        <circle cx="27.5" cy="26.5" r="2.5" fill="#fff" />
      </svg>
    </div>
    <div class="login-name">saiflow</div>
    <div class="login-tagline">Scan. Verify. Export.</div>

    <button class="line-btn" :disabled="lineLoading" @click="loginWithLine">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
        <path
          d="M12 3C6.48 3 2 6.64 2 11.13c0 4.03 3.55 7.4 8.35 8.04.33.07.77.22.88.5.1.26.07.66.03.92l-.14.86c-.04.26-.2 1.01.88.55 1.08-.46 5.84-3.44 7.97-5.89C20.44 14.4 22 12.9 22 11.13 22 6.64 17.52 3 12 3z"
        />
      </svg>
      <span>{{ lineLoading ? tt('common.loading') : tt('login.withLine') }}</span>
    </button>

    <p v-if="errorMsg" class="login-error">{{ errorMsg }}</p>

    <!-- 开发兜底：仅在 vite 开发模式显示，后端仍需 AUTH_DEV_MODE=1 -->
    <div v-if="isDev" class="dev-box">
      <div class="dev-title">{{ tt('login.devTitle') }}</div>
      <div class="dev-hint">{{ tt('login.devHint') }}</div>
      <div class="dev-row">
        <input
          v-model="devId"
          class="dev-input"
          :placeholder="tt('login.devPlaceholder')"
          @keyup.enter="loginWithDev"
        />
        <button class="dev-btn" :disabled="devLoading || !devId.trim()" @click="loginWithDev">
          {{ tt('login.devSubmit') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login {
  width: 100%;
  max-width: 430px;
  min-height: 100dvh;
  background: linear-gradient(160deg, #5a76ff 0%, #4a66f7 55%, #3a55e0 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 28px;
  color: #fff;
  gap: 10px;
}

.login-name {
  font-size: 28px;
  font-weight: 700;
  margin-top: 6px;
}

.login-tagline {
  font-size: 12px;
  opacity: 0.85;
  margin-bottom: 42px;
}

.line-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  max-width: 320px;
  height: 52px;
  border-radius: 999px;
  background: #06c755;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  transition: opacity 0.15s;
}

.line-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.login-error {
  margin: 4px 0 0;
  font-size: 12px;
  color: #ffe1e1;
  max-width: 320px;
  text-align: center;
}

.dev-box {
  margin-top: 40px;
  width: 100%;
  max-width: 320px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 14px;
  padding: 14px 16px;
}

.dev-title {
  font-size: 12px;
  font-weight: 700;
}

.dev-hint {
  font-size: 10px;
  opacity: 0.75;
  margin: 4px 0 10px;
}

.dev-row {
  display: flex;
  gap: 8px;
}

.dev-input {
  flex: 1;
  height: 38px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.95);
  padding: 0 12px;
  font-size: 13px;
  color: var(--text);
  outline: none;
}

.dev-btn {
  height: 38px;
  padding: 0 16px;
  border-radius: 10px;
  background: #fff;
  color: var(--primary);
  font-size: 12px;
  font-weight: 700;
}

.dev-btn:disabled {
  opacity: 0.6;
  cursor: default;
}
</style>
