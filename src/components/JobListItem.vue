<script setup lang="ts">
import type { JobSummary } from '../api';
import { useT } from '../i18nVue';
import StatusChip from './StatusChip.vue';

const { t } = useT();

defineProps<{
  job: JobSummary;
}>();

const emit = defineEmits<{
  (e: 'open', job: JobSummary): void;
}>();

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
</script>

<template>
  <button class="task-card" @click="emit('open', job)">
    <div class="task-icon">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A66F7" stroke-width="2" stroke-linecap="round">
        <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
        <path d="M14 2v6h6" />
      </svg>
    </div>
    <div class="task-main">
      <div class="task-name">{{ job.file_name || '—' }}</div>
      <div class="task-meta">
        {{ t('result.meta', { pages: job.page_count, tables: job.table_count }) }} · {{ formatTime(job.created_at) }}
      </div>
    </div>
    <StatusChip :status="job.status" />
  </button>
</template>

<style scoped>
.task-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 12px 14px;
  text-align: left;
}

.task-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.task-main {
  flex: 1;
  min-width: 0;
}

.task-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-meta {
  font-size: 10px;
  color: var(--text-secondary);
  margin-top: 2px;
}
</style>
