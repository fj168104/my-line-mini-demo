<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ApiError, createJob, getFile, type FileInfo } from '../api';
import { messageText } from '../i18n';
import { useT } from '../i18nVue';
import { currentWorkspace, navigate } from '../store';
import { newIdempotencyKey } from '../upload';
import PageHeader from '../components/PageHeader.vue';

const { t } = useT();

const props = defineProps<{
  fileId: string;
}>();

const file = ref<FileInfo | null>(null);
const errorMsg = ref('');
const starting = ref(false);

const withTables = ref(true);
const fieldExtraction = ref(true);

onMounted(async () => {
  try {
    const { file: f } = await getFile(props.fileId);
    file.value = f;
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? messageText(e.messageKey) : t('common.unknownError');
  }
});

function workspaceLabel(): string {
  const ws = currentWorkspace.value;
  if (!ws || ws.workspace_type === 'PERSONAL') return t('home.workspacePersonal');
  return ws.enterprise_name || t('my.company');
}

async function start() {
  if (starting.value) return;
  starting.value = true;
  errorMsg.value = '';
  try {
    const job = await createJob({
      file_id: props.fileId,
      params: {
        parse_mode: 'scan',
        table: withTables.value,
        formula: false,
        rotate: true,
      },
      idempotency_key: newIdempotencyKey(),
    });
    navigate('processing', { jobId: job.id });
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? messageText(e.messageKey) : t('common.unknownError');
    starting.value = false;
  }
}
</script>

<template>
  <div class="settings">
    <PageHeader :title="t('settings.title')" @back="navigate('confirm', { fileId })" />

    <div class="content">
      <!-- CONTENT -->
      <div class="caption">{{ t('settings.content') }}</div>
      <button class="radio-card" :class="{ selected: withTables }" @click="withTables = true">
        <span class="radio">
          <span v-if="withTables" class="radio-dot" />
        </span>
        <span class="radio-text">
          <strong>{{ t('settings.modeBoth') }}</strong>
          <small>{{ t('settings.modeBothSub') }}</small>
        </span>
      </button>
      <button class="radio-card" :class="{ selected: !withTables }" @click="withTables = false">
        <span class="radio">
          <span v-if="!withTables" class="radio-dot" />
        </span>
        <span class="radio-text">
          <strong>{{ t('settings.modeText') }}</strong>
          <small>{{ t('settings.modeTextSub') }}</small>
        </span>
      </button>

      <!-- DOCUMENT -->
      <div class="caption">{{ t('settings.document') }}</div>
      <div class="doc-card">
        <div class="doc-row">
          <span class="doc-label">{{ t('settings.language') }}</span>
          <span class="doc-value">
            {{ t('settings.languageAuto') }}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#99A1B0" stroke-width="2.2" stroke-linecap="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </span>
        </div>
        <div class="divider" />
        <div class="doc-row">
          <span class="doc-label">{{ t('settings.pages') }}</span>
          <span class="doc-value">
            {{ file ? t('settings.pagesAll', { n: file.page_count }) : '—' }}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#99A1B0" stroke-width="2.2" stroke-linecap="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </span>
        </div>
        <div class="divider" />
        <div class="doc-row">
          <span class="doc-label">{{ t('settings.fieldExtraction') }}</span>
          <span class="doc-value stack">
            <small>{{ t('settings.fieldTemplate') }}</small>
            <button
              class="switch"
              :class="{ on: fieldExtraction }"
              role="switch"
              :aria-checked="fieldExtraction"
              @click="fieldExtraction = !fieldExtraction"
            >
              <span class="knob" />
            </button>
          </span>
        </div>
      </div>

      <!-- 高级/提交 -->
      <div class="doc-card">
        <div class="doc-row">
          <span class="doc-label">{{ t('settings.advanced') }}</span>
          <span class="doc-value">
            <small>{{ t('settings.advancedSub') }}</small>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#99A1B0" stroke-width="2.2" stroke-linecap="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </span>
        </div>
        <div class="divider" />
        <div class="doc-row">
          <span class="doc-label">{{ t('settings.submitAs') }}</span>
          <span class="doc-value">
            <span class="ws-pill">{{ workspaceLabel() }}</span>
          </span>
        </div>
      </div>

      <p v-if="errorMsg" class="status-error">{{ errorMsg }}</p>

      <button class="start-btn" :disabled="starting || !file" @click="start">
        {{ starting ? t('common.loading') : t('settings.start') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.content {
  padding: 6px 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.caption {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--text-secondary);
  margin-top: 6px;
}

.radio-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  background: var(--card);
  border: 1.5px solid var(--border);
  border-radius: 14px;
  padding: 14px 16px;
  text-align: left;
}

.radio-card.selected {
  border-color: var(--primary);
}

.radio {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  border: 2px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}

.radio-card.selected .radio {
  border-color: var(--primary);
}

.radio-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--primary);
}

.radio-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.radio-text strong {
  font-size: 13px;
  color: var(--text);
}

.radio-text small {
  font-size: 11px;
  color: var(--text-secondary);
}

.doc-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 4px 16px;
}

.doc-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 0;
}

.doc-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}

.doc-value {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--icon);
}

.doc-value small {
  font-size: 11px;
  color: var(--text-secondary);
}

.doc-value.stack {
  gap: 10px;
}

.divider {
  height: 1px;
  background: var(--border);
}

.switch {
  width: 40px;
  height: 22px;
  border-radius: 999px;
  background: var(--track);
  position: relative;
  transition: background 0.15s;
  flex-shrink: 0;
}

.switch.on {
  background: var(--primary);
}

.knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(23, 26, 28, 0.25);
  transition: left 0.15s;
}

.switch.on .knob {
  left: 20px;
}

.ws-pill {
  background: var(--primary-light);
  color: var(--primary);
  font-size: 11px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 999px;
}

.status-error {
  margin: 0;
  text-align: center;
  font-size: 12px;
  color: var(--danger);
}

.start-btn {
  height: 53px;
  border-radius: 14px;
  background: var(--primary);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  margin-top: 8px;
}

.start-btn:disabled {
  opacity: 0.6;
}
</style>
