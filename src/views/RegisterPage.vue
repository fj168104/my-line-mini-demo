<script setup lang="ts">
import { ref } from 'vue';
import { register } from '../api';
import { useT } from '../i18nVue';
import LangSwitch from '../components/LangSwitch.vue';

const { t } = useT();

const username = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

const emit = defineEmits<{
  (e: 'registered'): void;
  (e: 'go-login'): void;
}>();

async function handleSubmit() {
  errorMsg.value = '';
  successMsg.value = '';

  const u = username.value.trim();
  const m = email.value.trim();
  if (!u || !m || !password.value) {
    errorMsg.value = t('register.errRequired');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m)) {
    errorMsg.value = t('register.errEmail');
    return;
  }
  if (password.value.length < 6) {
    errorMsg.value = t('register.errPwdLen');
    return;
  }
  if (password.value !== confirmPassword.value) {
    errorMsg.value = t('register.errPwdMatch');
    return;
  }

  loading.value = true;
  try {
    await register(u, m, password.value);
    // 注册成功：短暂提示后回到登录页
    successMsg.value = t('register.success');
    setTimeout(() => emit('registered'), 800);
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : t('register.errFailed');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="page">
    <LangSwitch />
    <div class="card">
      <h1>{{ t('register.title') }}</h1>
      <p class="subtitle">{{ t('register.subtitle') }}</p>

      <form @submit.prevent="handleSubmit">
        <label class="field">
          <span>{{ t('register.username') }}</span>
          <input
            v-model="username"
            type="text"
            :placeholder="t('register.usernamePh')"
            autocomplete="username"
          />
        </label>

        <label class="field">
          <span>{{ t('register.email') }}</span>
          <input
            v-model="email"
            type="email"
            :placeholder="t('register.emailPh')"
            autocomplete="email"
          />
        </label>

        <label class="field">
          <span>{{ t('register.password') }}</span>
          <input
            v-model="password"
            type="password"
            :placeholder="t('register.passwordPh')"
            autocomplete="new-password"
          />
        </label>

        <label class="field">
          <span>{{ t('register.confirm') }}</span>
          <input
            v-model="confirmPassword"
            type="password"
            :placeholder="t('register.confirmPh')"
            autocomplete="new-password"
          />
        </label>

        <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
        <p v-if="successMsg" class="success">{{ successMsg }}</p>

        <button type="submit" :disabled="loading">
          {{ loading ? t('register.submitting') : t('register.submit') }}
        </button>
      </form>

      <p class="switch">
        {{ t('register.haveAccount') }}
        <a href="javascript:void(0)" @click="emit('go-login')">{{ t('register.backToLogin') }}</a>
      </p>
    </div>
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

.card {
  width: 100%;
  max-width: 380px;
  padding: 32px 28px;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 20px 60px rgb(0 0 0 / 20%);
  text-align: center;
}

h1 {
  margin: 0 0 4px;
  font-size: 26px;
  color: #1a1a2e;
}

.subtitle {
  margin: 0 0 24px;
  color: #8a8a9a;
  font-size: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 14px;
  text-align: left;
}

.field span {
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #3a3a4a;
}

.field input {
  width: 100%;
  padding: 11px 14px;
  border: 1px solid #d8d8e6;
  border-radius: 10px;
  font-size: 15px;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.field input:focus {
  outline: none;
  border-color: #4a6cf7;
}

.error {
  margin: 0 0 12px;
  color: #e74c3c;
  font-size: 13px;
}

.success {
  margin: 0 0 12px;
  color: #27ae60;
  font-size: 13px;
}

button {
  width: 100%;
  padding: 13px;
  border: none;
  border-radius: 10px;
  background: #4a6cf7;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover:not(:disabled) {
  background: #3a5ce5;
}

button:disabled {
  background: #aab4e8;
  cursor: not-allowed;
}

.switch {
  margin: 16px 0 0;
  color: #8a8a9a;
  font-size: 13px;
}

.switch a {
  color: #4a6cf7;
  text-decoration: none;
}

.switch a:hover {
  text-decoration: underline;
}
</style>
