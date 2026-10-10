<script setup lang="ts">
import { ref } from 'vue';
import { logout } from '../api';
import { getLocale, setLocale, type Locale } from '../i18n';
import { useT } from '../i18nVue';
import { signOutLocally, user, workspaces } from '../store';

const { t, locale } = useT();

const loggingOut = ref(false);

const enterpriseList = workspaces.value.filter((w) => w.workspace_type === 'ENTERPRISE');

function switchLanguage(l: Locale) {
  setLocale(l);
}

async function doLogout() {
  if (loggingOut.value) return;
  loggingOut.value = true;
  try {
    await logout();
  } finally {
    signOutLocally();
    loggingOut.value = false;
  }
}
</script>

<template>
  <div class="my">
    <header class="my-header">
      <h1>{{ t('my.title') }}</h1>
    </header>

    <div class="content">
      <!-- 资料卡 -->
      <div class="profile-card">
        <div class="avatar">
          <img v-if="user?.avatar_url" :src="user.avatar_url" :alt="user?.display_name" />
          <svg v-else width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#596170" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
          </svg>
        </div>
        <div class="profile-main">
          <div class="profile-name">{{ user?.display_name || '—' }}</div>
          <div class="line-connected">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1F9E6B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            {{ t('my.lineConnected') }}
          </div>
        </div>
      </div>

      <!-- 语言 -->
      <div class="row-card">
        <span class="row-label">{{ t('my.language') }}</span>
        <div class="lang-switch">
          <button :class="{ active: locale === 'th' }" @click="switchLanguage('th')">ไทย</button>
          <button :class="{ active: locale === 'en' }" @click="switchLanguage('en')">EN</button>
        </div>
      </div>

      <!-- 公司 -->
      <div class="company-card">
        <div class="company-head">
          <div class="company-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A66F7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 21h18" />
              <path d="M5 21V7l7-4 7 4v14" />
              <path d="M9 21v-4h6v4" />
            </svg>
          </div>
          <div class="company-main">
            <div class="company-title">{{ t('my.company') }}</div>
            <div v-if="enterpriseList.length === 0" class="company-empty">
              {{ t('my.companyEmpty') }}
            </div>
          </div>
        </div>
        <div v-for="(ws, i) in enterpriseList" :key="ws.enterprise_id ?? `${ws.enterprise_name}-${i}`" class="company-row">
          <span>{{ ws.enterprise_name }}</span>
          <em>{{ ws.role }}</em>
        </div>
        <button v-if="enterpriseList.length === 0" class="company-cta">
          {{ t('my.companyApply') }}
        </button>
      </div>

      <!-- 登出 -->
      <button class="logout-btn" :disabled="loggingOut" @click="doLogout">
        {{ loggingOut ? t('my.loggingOut') : t('my.logout') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.my {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.my-header {
  padding: 20px 20px 12px;
}

.my-header h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
}

.content {
  padding: 0 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.profile-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.avatar {
  width: 62px;
  height: 62px;
  border-radius: 999px;
  background: var(--track);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-main {
  min-width: 0;
}

.profile-name {
  font-size: 14px;
  font-weight: 700;
}

.line-connected {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  color: var(--success);
  margin-top: 4px;
}

.row-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.row-label {
  font-size: 12px;
  font-weight: 600;
}

.lang-switch {
  display: flex;
  background: var(--track);
  border-radius: 999px;
  padding: 3px;
}

.lang-switch button {
  height: 28px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: var(--icon);
}

.lang-switch button.active {
  background: var(--card);
  color: var(--primary);
  box-shadow: 0 1px 3px rgba(23, 26, 28, 0.12);
}

.company-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.company-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.company-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.company-title {
  font-size: 12px;
  font-weight: 700;
}

.company-empty {
  font-size: 10px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.company-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  padding: 8px 2px 0;
  border-top: 1px solid var(--border);
}

.company-row em {
  font-style: normal;
  color: var(--text-secondary);
  font-weight: 600;
}

.company-cta {
  height: 38px;
  border-radius: 10px;
  background: var(--primary-light);
  color: var(--primary);
  font-size: 11px;
  font-weight: 700;
}

.logout-btn {
  height: 48px;
  border-radius: 14px;
  background: var(--card);
  border: 1px solid var(--border);
  color: var(--danger);
  font-size: 13px;
  font-weight: 700;
  margin-top: 6px;
}

.logout-btn:disabled {
  opacity: 0.6;
}
</style>
