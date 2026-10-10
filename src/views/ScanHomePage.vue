<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ApiError, importFromUrl, listJobs, type JobSummary } from '../api';
import { messageText } from '../i18n';
import { useT } from '../i18nVue';
import { currentWorkspace, navigate } from '../store';
import { uploadFile } from '../upload';
import JobListItem from '../components/JobListItem.vue';

const { t: tt } = useT();

const recentJobs = ref<JobSummary[]>([]);
const loading = ref(true);
const errorMsg = ref('');
const uploading = ref(false);
const uploadPct = ref(0);
const urlMode = ref(false);
const urlValue = ref('');
const urlBusy = ref(false);

const fileInput = ref<HTMLInputElement | null>(null);
const imageInput = ref<HTMLInputElement | null>(null);
const cameraInput = ref<HTMLInputElement | null>(null);

async function loadRecent() {
  loading.value = true;
  errorMsg.value = '';
  try {
    const data = await listJobs({ page: 1, page_size: 10 });
    recentJobs.value = data.items;
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? messageText(e.messageKey) : tt('common.unknownError');
  } finally {
    loading.value = false;
  }
}

onMounted(loadRecent);

function workspaceLabel(): string {
  const ws = currentWorkspace.value;
  if (!ws || ws.workspace_type === 'PERSONAL') return tt('home.workspacePersonal');
  return ws.enterprise_name || tt('my.company');
}

async function onPicked(target: HTMLInputElement | null) {
  const file = target?.files?.[0];
  if (!file || uploading.value) return;
  uploading.value = true;
  uploadPct.value = 0;
  errorMsg.value = '';
  try {
    const ready = await uploadFile(file);
    navigate('confirm', { fileId: ready.id });
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? messageText(e.messageKey) : tt('common.unknownError');
  } finally {
    uploading.value = false;
    if (target) target.value = '';
  }
}

async function submitUrl() {
  const url = urlValue.value.trim();
  if (!url || urlBusy.value) return;
  urlBusy.value = true;
  errorMsg.value = '';
  try {
    const { file } = await importFromUrl(url);
    urlMode.value = false;
    urlValue.value = '';
    navigate('confirm', { fileId: file.id });
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? messageText(e.messageKey) : tt('common.unknownError');
  } finally {
    urlBusy.value = false;
  }
}

function openJob(job: JobSummary) {
  const running = ['QUEUED', 'PREPROCESSING', 'PROCESSING', 'POSTPROCESSING', 'CANCEL_REQUESTED'].includes(
    job.status,
  );
  navigate(running ? 'processing' : 'result', { jobId: job.id });
}

// 隐藏 input 由卡片点击触发
function pick(kind: 'camera' | 'photos' | 'files') {
  const el = kind === 'camera' ? cameraInput.value : kind === 'photos' ? imageInput.value : fileInput.value;
  el?.click();
}
</script>

<template>
  <div class="home">
    <header class="home-header">
      <div class="brand">saiflow</div>
      <div class="header-right">
        <div class="ws-pill">
          <span>{{ workspaceLabel() }}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
        <button class="bell" :aria-label="tt('history.title')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#596170" stroke-width="2" stroke-linecap="round">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
        </button>
      </div>
    </header>

    <div class="content">
      <!-- 三个入口卡片 -->
      <div class="entry-grid">
        <button class="entry-card" :disabled="uploading" @click="pick('camera')">
          <div class="entry-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4A66F7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
          <span>{{ tt('home.camera') }}</span>
        </button>
        <button class="entry-card" :disabled="uploading" @click="pick('photos')">
          <div class="entry-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4A66F7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
          <span>{{ tt('home.photos') }}</span>
        </button>
        <button class="entry-card" :disabled="uploading" @click="pick('files')">
          <div class="entry-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4A66F7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
              <path d="M13 2v7h7" />
            </svg>
          </div>
          <span>{{ tt('home.files') }}</span>
        </button>
      </div>

      <!-- 隐藏的文件选择 -->
      <input ref="cameraInput" type="file" accept="image/jpeg,image/png" capture="environment" hidden @change="onPicked(cameraInput)" />
      <input ref="imageInput" type="file" accept="image/jpeg,image/png" hidden @change="onPicked(imageInput)" />
      <input ref="fileInput" type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" hidden @change="onPicked(fileInput)" />

      <!-- URL 导入 -->
      <button v-if="!urlMode" class="url-row" @click="urlMode = true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A66F7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
          <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
        </svg>
        <span>{{ tt('home.importUrl') }}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#99A1B0" stroke-width="2.2" stroke-linecap="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
      <div v-else class="url-editor">
        <input
          v-model="urlValue"
          class="url-input"
          :placeholder="tt('home.urlPlaceholder')"
          @keyup.enter="submitUrl"
        />
        <button class="url-submit" :disabled="urlBusy || !urlValue.trim()" @click="submitUrl">
          {{ urlBusy ? tt('common.loading') : tt('home.urlSubmit') }}
        </button>
      </div>

      <p v-if="uploading" class="status-line">{{ tt('home.uploading', { pct: uploadPct }) }}</p>
      <p v-else-if="errorMsg" class="status-line error">{{ errorMsg }}</p>

      <!-- 最近任务 -->
      <div class="section-title">{{ tt('home.recent') }}</div>
      <div v-if="loading" class="status-line">{{ tt('common.loading') }}</div>
      <div v-else-if="recentJobs.length === 0" class="status-line">{{ tt('history.empty') }}</div>
      <div v-else class="task-list">
        <JobListItem v-for="job in recentJobs" :key="job.id" :job="job" @open="openJob" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.home-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 12px;
}

.brand {
  font-size: 18px;
  font-weight: 800;
  color: var(--primary);
  letter-spacing: 0.3px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ws-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 600;
  color: var(--icon);
  max-width: 150px;
}

.ws-pill span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bell {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 999px;
}

.content {
  padding: 4px 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.entry-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.entry-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 16px 8px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}

.entry-card:disabled {
  opacity: 0.6;
}

.entry-icon {
  width: 44px;
  height: 44px;
  border-radius: 999px;
  background: var(--primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
}

.url-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 14px 16px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  text-align: left;
}

.url-row span {
  flex: 1;
}

.url-editor {
  display: flex;
  gap: 8px;
}

.url-input {
  flex: 1;
  height: 44px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--card);
  padding: 0 14px;
  font-size: 12px;
  outline: none;
}

.url-input:focus {
  border-color: var(--primary);
}

.url-submit {
  height: 44px;
  padding: 0 18px;
  border-radius: 12px;
  background: var(--primary);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.url-submit:disabled {
  opacity: 0.6;
}

.status-line {
  margin: 0;
  font-size: 11px;
  color: var(--text-secondary);
  text-align: center;
}

.status-line.error {
  color: var(--danger);
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  margin-top: 6px;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
