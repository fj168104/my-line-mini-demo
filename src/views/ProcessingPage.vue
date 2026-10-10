<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { ApiError, cancelJob, getJob, type JobSummary } from '../api';
import { messageText } from '../i18n';
import { useT } from '../i18nVue';
import { goTab, navigate } from '../store';
import PageHeader from '../components/PageHeader.vue';

const { t } = useT();

const props = defineProps<{
  jobId: string;
}>();

const job = ref<JobSummary | null>(null);
const errorMsg = ref('');
const cancelling = ref(false);
let timer: ReturnType<typeof setTimeout> | null = null;

const RUNNING = ['QUEUED', 'PREPROCESSING', 'PROCESSING', 'POSTPROCESSING', 'CANCEL_REQUESTED'];

const steps = computed(() => {
  const status = job.value?.status ?? 'QUEUED';
  const uploaded = true;
  const pre = !['QUEUED'].includes(status);
  const proc = ['PROCESSING', 'POSTPROCESSING', 'SUCCEEDED', 'PARTIAL_SUCCESS', 'FAILED', 'CANCELLED'].includes(status);
  const post = ['POSTPROCESSING', 'SUCCEEDED', 'PARTIAL_SUCCESS'].includes(status);
  const failed = ['FAILED', 'CANCELLED'].includes(status);
  return [
    { key: 'UPLOADED', done: uploaded && !failed, active: false },
    { key: 'PREPROCESSING', done: pre && !failed, active: status === 'PREPROCESSING' },
    { key: 'PROCESSING', done: proc && !failed, active: status === 'PROCESSING' },
    { key: 'POSTPROCESSING', done: post && !failed, active: status === 'POSTPROCESSING' },
  ];
});

async function poll() {
  try {
    job.value = await getJob(props.jobId);
    if (RUNNING.includes(job.value.status)) {
      timer = setTimeout(poll, 2000);
    }
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? messageText(e.messageKey) : t('common.unknownError');
  }
}

onMounted(poll);

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
});

async function cancel() {
  if (cancelling.value || !job.value) return;
  cancelling.value = true;
  errorMsg.value = '';
  try {
    job.value = await cancelJob(props.jobId);
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? messageText(e.messageKey) : t('common.unknownError');
  } finally {
    cancelling.value = false;
  }
}
</script>

<template>
  <div class="processing">
    <PageHeader :title="t('processing.title')" @back="goTab('scan')" />

    <div class="content">
      <div class="status-card" v-if="job">
        <div class="spinner" :class="{ done: !RUNNING.includes(job.status) }" />
        <div class="status-title">{{ t('processing.recognizing') }}</div>
        <div class="status-sub">{{ job.file_name }} · {{ t('settings.pagesAll', { n: job.page_count }) }}</div>

        <div class="steps">
          <div v-for="(step, i) in steps" :key="step.key" class="step">
            <div
              class="step-dot"
              :class="{ done: step.done, active: step.active }"
            >
              <svg v-if="step.done" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span v-else-if="step.active" class="step-pulse" />
            </div>
            <span class="step-label" :class="{ on: step.done || step.active }">{{ t(`processing.step.${step.key}`) }}</span>
            <div v-if="i < steps.length - 1" class="step-line" :class="{ done: steps[i + 1].done || steps[i + 1].active }" />
          </div>
        </div>
      </div>

      <div v-else-if="errorMsg" class="info-box error">{{ errorMsg }}</div>
      <div v-else class="status-card"><div class="spinner" /></div>

      <div class="info-box">{{ t('processing.info') }}</div>

      <p v-if="errorMsg && job" class="status-error">{{ errorMsg }}</p>

      <button class="home-btn" @click="goTab('scan')">{{ t('processing.backHome') }}</button>
      <button v-if="job && RUNNING.includes(job.status)" class="cancel-btn" :disabled="cancelling" @click="cancel">
        {{ t('processing.cancelTask') }}
      </button>
      <button v-else-if="job" class="cancel-btn" @click="navigate('result', { jobId: job.id })">
        {{ t('common.done') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.processing {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.content {
  padding: 12px 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.status-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 26px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3.5px solid var(--primary-light);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}

.spinner.done {
  animation: none;
  border-color: var(--success);
  border-top-color: var(--success);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.status-title {
  font-size: 14px;
  font-weight: 700;
  margin-top: 6px;
}

.status-sub {
  font-size: 11px;
  color: var(--text-secondary);
}

.steps {
  display: flex;
  align-items: flex-start;
  margin-top: 20px;
  width: 100%;
  justify-content: center;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  position: relative;
  width: 76px;
}

.step-dot {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: var(--track);
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-dot.done {
  background: var(--primary);
}

.step-dot.active {
  background: var(--primary-light);
}

.step-pulse {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--primary);
  animation: pulse 1.1s ease-in-out infinite;
}

@keyframes pulse {
  50% {
    transform: scale(0.7);
    opacity: 0.6;
  }
}

.step-label {
  font-size: 8px;
  color: var(--text-secondary);
  text-align: center;
}

.step-label.on {
  color: var(--primary);
  font-weight: 600;
}

.step-line {
  position: absolute;
  top: 13px;
  left: calc(50% + 15px);
  width: calc(100% - 30px);
  height: 2px;
  background: var(--track);
  border-radius: 2px;
}

.step-line.done {
  background: var(--primary);
}

.info-box {
  background: var(--primary-light);
  border-radius: 12px;
  padding: 13px 16px;
  font-size: 11px;
  color: var(--icon);
  line-height: 1.6;
}

.info-box.error {
  background: #fdeaea;
  color: var(--danger);
}

.status-error {
  margin: 0;
  text-align: center;
  font-size: 12px;
  color: var(--danger);
}

.home-btn {
  height: 48px;
  border-radius: 14px;
  background: var(--primary-light);
  color: var(--primary);
  font-size: 13px;
  font-weight: 700;
}

.cancel-btn {
  height: 40px;
  font-size: 13px;
  font-weight: 600;
  color: var(--danger);
}

.cancel-btn:disabled {
  opacity: 0.6;
}
</style>
