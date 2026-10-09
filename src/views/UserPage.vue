<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { getUserInfo, logout, type UserInfo } from '../api';
import { useT } from '../i18nVue';
import { getLocale } from '../i18n';
import LangSwitch from '../components/LangSwitch.vue';

const { t } = useT();

const user = ref<UserInfo | null>(null);
const loading = ref(true);
const errorMsg = ref('');
const loggingOut = ref(false);

const emit = defineEmits<{
  (e: 'logged-out'): void;
  (e: 'go-ocr'): void;
  (e: 'go-textin-ocr'): void;
}>();

async function loadUser() {
  loading.value = true;
  errorMsg.value = '';
  try {
    user.value = await getUserInfo();
  } catch (err) {
    // token 失效等情况，回到登录页
    emit('logged-out');
  } finally {
    loading.value = false;
  }
}

async function handleLogout() {
  loggingOut.value = true;
  try {
    await logout();
  } finally {
    loggingOut.value = false;
    emit('logged-out');
  }
}

/** 格式化注册时间（按当前语言使用对应区域格式） */
function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(getLocale() === 'th' ? 'th-TH' : 'en-US', { hour12: false });
}

onMounted(loadUser);
</script>

<template>
  <main class="page">
    <LangSwitch />
    <div v-if="loading" class="loading">{{ t('common.loading') }}</div>

    <div v-else-if="user" class="card">
      <div class="avatar">{{ user.username.charAt(0).toUpperCase() }}</div>

      <h1>{{ user.username }}</h1>
      <p class="email">{{ user.email }}</p>

      <ul class="info-list">
        <li>
          <span class="label">{{ t('user.userId') }}</span>
          <span class="value">{{ user.id }}</span>
        </li>
        <li>
          <span class="label">{{ t('user.createdAt') }}</span>
          <span class="value">{{ formatDate(user.created_at) }}</span>
        </li>
      </ul>

      <!-- 临时隐藏 Google Vision OCR 入口，保留代码便于恢复 -->
      <button v-if="false" class="ocr-btn" @click="emit('go-ocr')">{{ t('user.ocrPhoto') }}</button>
      <button class="ocr-btn textin" @click="emit('go-textin-ocr')">{{ t('user.ocrSmart') }}</button>

      <button class="logout-btn" :disabled="loggingOut" @click="handleLogout">
        {{ loggingOut ? t('user.loggingOut') : t('user.logout') }}
      </button>
    </div>

    <p v-else class="error">{{ errorMsg || t('user.loadFailed') }}</p>
  </main>
</template>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: linear-gradient(135deg, #6a8dff 0%, #4a6cf7 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.loading {
  color: #fff;
  font-size: 16px;
}

.card {
  width: 100%;
  max-width: 380px;
  padding: 36px 28px;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 20px 60px rgb(0 0 0 / 20%);
  text-align: center;
}

.avatar {
  width: 80px;
  height: 80px;
  margin: 0 auto 16px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4a6cf7, #6a8dff);
  color: #fff;
  font-size: 36px;
  font-weight: 700;
  line-height: 80px;
}

h1 {
  margin: 0 0 4px;
  font-size: 24px;
  color: #1a1a2e;
}

.email {
  margin: 0 0 24px;
  color: #8a8a9a;
  font-size: 14px;
}

.info-list {
  list-style: none;
  padding: 0;
  margin: 0 0 28px;
  border-top: 1px solid #eee;
  text-align: left;
}

.info-list li {
  display: flex;
  justify-content: space-between;
  padding: 12px 4px;
  border-bottom: 1px solid #eee;
  font-size: 14px;
}

.label {
  color: #8a8a9a;
}

.value {
  color: #1a1a2e;
  font-weight: 500;
}

.logout-btn {
  width: 100%;
  padding: 12px;
  border: 1px solid #e74c3c;
  border-radius: 10px;
  background: #fff;
  color: #e74c3c;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.ocr-btn {
  width: 100%;
  padding: 12px;
  margin-bottom: 12px;
  border: none;
  border-radius: 10px;
  background: #4a6cf7;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.ocr-btn:hover {
  background: #3a5ce5;
}

.logout-btn:hover:not(:disabled) {
  background: #e74c3c;
  color: #fff;
}

.logout-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  color: #fff;
  font-size: 15px;
}
</style>
