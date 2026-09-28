<script setup lang="ts">
import { ref } from 'vue';
import { login } from '../api';

const account = ref('');
const password = ref('');
const loading = ref(false);
const errorMsg = ref('');

// 从注册页跳转回来时的成功提示
const props = defineProps<{ notice?: string }>();

const emit = defineEmits<{
  (e: 'logged-in'): void;
  (e: 'go-register'): void;
}>();

async function handleSubmit() {
  if (!account.value.trim() || !password.value) {
    errorMsg.value = '请输入账号和密码';
    return;
  }
  loading.value = true;
  errorMsg.value = '';
  try {
    await login(account.value.trim(), password.value);
    emit('logged-in');
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '登录失败';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="page">
    <div class="card">
      <h1>用户登录</h1>
      <p class="subtitle">SaiFlow 用户中心</p>

      <form @submit.prevent="handleSubmit">
        <label class="field">
          <span>账号</span>
          <input
            v-model="account"
            type="text"
            placeholder="用户名或邮箱"
            autocomplete="username"
          />
        </label>

        <label class="field">
          <span>密码</span>
          <input
            v-model="password"
            type="password"
            placeholder="请输入密码"
            autocomplete="current-password"
          />
        </label>

        <p v-if="props.notice" class="success">{{ props.notice }}</p>
        <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

        <button type="submit" :disabled="loading">
          {{ loading ? '登录中…' : '登录' }}
        </button>
      </form>

      <p class="switch">
        还没有账号？
        <a href="javascript:void(0)" @click="emit('go-register')">立即注册</a>
      </p>

      <p class="hint">默认账号：bob / 密码：Pass1234</p>
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
  margin-bottom: 16px;
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
  padding: 12px 14px;
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

.hint {
  margin: 16px 0 0;
  color: #a0a0b0;
  font-size: 12px;
}
</style>
