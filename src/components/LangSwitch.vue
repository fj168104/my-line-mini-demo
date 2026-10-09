<script setup lang="ts">
// 全局语言切换器：EN / ไทย，固定在右上角，适用于所有页面背景。
import { locale } from '../i18nVue';
import type { Locale } from '../i18n';

const options: { value: Locale; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'th', label: 'ไทย' },
];
</script>

<template>
  <div class="lang-switch">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      :class="{ active: locale === opt.value }"
      @click="locale = opt.value"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<style scoped>
.lang-switch {
  position: fixed;
  top: 14px;
  right: 14px;
  z-index: 1000;
  display: flex;
  gap: 4px;
  padding: 3px;
  border-radius: 999px;
  background: rgb(255 255 255 / 88%);
  box-shadow: 0 2px 8px rgb(0 0 0 / 14%);
  backdrop-filter: blur(4px);
}

.lang-switch button {
  border: none;
  padding: 5px 12px;
  border-radius: 999px;
  background: transparent;
  color: #3a3a4a;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.lang-switch button.active {
  background: #4a6cf7;
  color: #fff;
}
</style>
