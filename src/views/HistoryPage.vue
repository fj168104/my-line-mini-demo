<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ApiError, listJobs, type JobSummary } from '../api';
import { messageText } from '../i18n';
import { useT } from '../i18nVue';
import { currentWorkspace, navigate } from '../store';
import JobListItem from '../components/JobListItem.vue';

const { t } = useT();

const jobs = ref<JobSummary[]>([]);
const loading = ref(true);
const errorMsg = ref('');
const keyword = ref('');
const filter = ref<'all' | 'completed' | 'processing' | 'failed'>('all');

const FILTERS = ['all', 'completed', 'processing', 'failed'] as const;

const RUNNING = ['QUEUED', 'PREPROCESSING', 'PROCESSING', 'POSTPROCESSING', 'CANCEL_REQUESTED'];

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  return jobs.value.filter((j) => {
    if (filter.value === 'completed' && !(j.status === 'SUCCEEDED' || j.status === 'PARTIAL_SUCCESS')) return false;
    if (filter.value === 'processing' && !RUNNING.includes(j.status)) return false;
    if (filter.value === 'failed' && !(j.status === 'FAILED' || j.status === 'CANCELLED')) return false;
    if (kw && !j.file_name.toLowerCase().includes(kw)) return false;
    return true;
  });
});

async function load() {
  loading.value = true;
  errorMsg.value = '';
  try {
    const data = await listJobs({ page: 1, page_size: 50 });
    jobs.value = data.items;
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? messageText(e.messageKey) : t('common.unknownError');
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function workspaceLabel(): string {
  const ws = currentWorkspace.value;
  if (!ws || ws.workspace_type === 'PERSONAL') return t('home.workspacePersonal');
  return ws.enterprise_name || t('my.company');
}

function openJob(job: JobSummary) {
  navigate(RUNNING.includes(job.status) ? 'processing' : 'result', { jobId: job.id });
}
</script>

<template>
  <div class="history">
    <header class="history-header">
      <h1>{{ t('history.title') }}</h1>
      <div class="ws-pill">{{ workspaceLabel() }}</div>
    </header>

    <div class="content">
      <div class="search-card">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#99A1B0" stroke-width="2" stroke-linecap="round">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <input v-model="keyword" class="search-input" :placeholder="t('history.searchPlaceholder')" />
      </div>

      <div class="filter-row">
        <button
          v-for="f in FILTERS"
          :key="f"
          class="filter-chip"
          :class="{ active: filter === f }"
          @click="filter = f"
        >
          {{ t(`history.filter.${f}`) }}
        </button>
      </div>

      <p v-if="errorMsg" class="status-error">{{ errorMsg }}</p>
      <div v-if="loading" class="status-line">{{ t('common.loading') }}</div>
      <div v-else-if="filtered.length === 0" class="status-line">{{ t('history.empty') }}</div>
      <div v-else class="task-list">
        <JobListItem v-for="job in filtered" :key="job.id" :job="job" @open="openJob" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.history {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 12px;
}

.history-header h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
}

.ws-pill {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 600;
  color: var(--icon);
  max-width: 150px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.content {
  padding: 0 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-card {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0 14px;
  height: 44px;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 12px;
  background: transparent;
  color: var(--text);
}

.search-input::placeholder {
  color: var(--text-secondary);
}

.filter-row {
  display: flex;
  gap: 8px;
}

.filter-chip {
  height: 32px;
  padding: 0 14px;
  border-radius: 999px;
  background: var(--card);
  border: 1px solid var(--border);
  font-size: 11px;
  font-weight: 600;
  color: var(--icon);
}

.filter-chip.active {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}

.status-line {
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
  padding: 24px 0;
}

.status-error {
  margin: 0;
  text-align: center;
  font-size: 12px;
  color: var(--danger);
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
