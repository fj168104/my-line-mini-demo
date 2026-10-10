<script setup lang="ts">
import { useT } from '../i18nVue';

const { t } = useT();

defineProps<{
  title: string;
}>();

const emit = defineEmits<{
  (e: 'back'): void;
}>();
</script>

<template>
  <header class="page-header">
    <button class="back-btn" :aria-label="t('common.back')" @click="emit('back')">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
    <h1 class="page-title">{{ title }}</h1>
    <div class="header-slot"><slot /></div>
  </header>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px 10px;
  background: var(--bg);
}

.back-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text);
  border-radius: 10px;
}

.page-title {
  font-size: 14px;
  font-weight: 700;
  margin: 0;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-slot {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
