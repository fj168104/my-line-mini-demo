<script setup lang="ts">
import { onMounted, ref } from 'vue';
import LoginPage from './views/LoginPage.vue';
import RegisterPage from './views/RegisterPage.vue';
import UserPage from './views/UserPage.vue';
import OcrPage from './views/OcrPage.vue';
import { getUserInfo, getToken } from './api';

// 当前视图：登录页 / 注册页 / 用户信息页 / OCR 页
type View = 'login' | 'register' | 'user' | 'ocr';
const view = ref<View>('login');
const checking = ref(true);
// 注册成功后回到登录页的提示
const loginNotice = ref('');

async function checkAuth() {
  checking.value = true;
  if (!getToken()) {
    view.value = 'login';
    checking.value = false;
    return;
  }
  try {
    await getUserInfo();
    view.value = 'user';
  } catch {
    // token 失效，回登录页
    view.value = 'login';
  } finally {
    checking.value = false;
  }
}

function onLoggedIn() {
  loginNotice.value = '';
  view.value = 'user';
}

function onLoggedOut() {
  view.value = 'login';
}

function goRegister() {
  loginNotice.value = '';
  view.value = 'register';
}

function onRegistered() {
  loginNotice.value = '注册成功，请登录';
  view.value = 'login';
}

function goOcr() {
  view.value = 'ocr';
}

function backFromOcr() {
  view.value = 'user';
}

onMounted(checkAuth);
</script>

<template>
  <div v-if="checking" class="boot">加载中…</div>
  <OcrPage v-else-if="view === 'ocr'" @back="backFromOcr" />
  <UserPage v-else-if="view === 'user'" @logged-out="onLoggedOut" @go-ocr="goOcr" />
  <RegisterPage
    v-else-if="view === 'register'"
    @registered="onRegistered"
    @go-login="view = 'login'"
  />
  <LoginPage
    v-else
    :notice="loginNotice"
    @logged-in="onLoggedIn"
    @go-register="goRegister"
  />
</template>

<style>
body {
  margin: 0;
}

.boot {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6a8dff 0%, #4a6cf7 100%);
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 16px;
}
</style>
