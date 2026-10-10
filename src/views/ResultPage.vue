<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  ApiError,
  createExport,
  deleteJob,
  exportDownloadUrl,
  filePagePreviewUrl,
  getJob,
  getJobResults,
  rerunJob,
  reviewCells,
  type JobResults,
  type JobSummary,
  type ResultCell,
  type ResultPage as PageData,
  type ResultTable,
} from '../api';
import { messageText } from '../i18n';
import { useT } from '../i18nVue';
import { goTab, navigate } from '../store';
import PageHeader from '../components/PageHeader.vue';
import StatusChip from '../components/StatusChip.vue';

const { t } = useT();

const props = defineProps<{
  jobId: string;
}>();

type Tab = 'tables' | 'text' | 'fields' | 'original';
const tab = ref<Tab>('tables');

const results = ref<JobResults | null>(null);
const job = ref<JobSummary | null>(null);
const errorMsg = ref('');
const notice = ref('');

const activePage = ref(1);

// 单元格复核
const editing = ref<{ pageNumber: number; table: ResultTable; cell: ResultCell } | null>(null);
const editText = ref('');
const editBusy = ref(false);
const confirmBusy = ref(false);

// 导出
const exportBusy = ref('');

const currentPage = computed<PageData | null>(
  () => results.value?.pages.find((p) => p.page_number === activePage.value) ?? results.value?.pages[0] ?? null,
);

async function load() {
  try {
    [results.value, job.value] = await Promise.all([getJobResults(props.jobId), getJob(props.jobId)]);
    if (!results.value.pages.some((p) => p.page_number === activePage.value)) {
      activePage.value = results.value.pages[0]?.page_number ?? 1;
    }
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? messageText(e.messageKey) : t('common.unknownError');
  }
}

onMounted(load);

function openEditor(table: ResultTable, cell: ResultCell) {
  editing.value = { pageNumber: currentPage.value?.page_number ?? 1, table, cell };
  editText.value = cell.current_text;
}

async function saveEdit() {
  if (!editing.value || editBusy.value || !results.value) return;
  editBusy.value = true;
  notice.value = '';
  errorMsg.value = '';
  try {
    const { pageNumber, table, cell } = editing.value;
    results.value = await reviewCells(props.jobId, {
      expected_version: results.value.version,
      edits: [
        {
          page_number: pageNumber,
          table_id: table.table_id,
          row_index: cell.row_index,
          column_index: cell.column_index,
          current_text: editText.value,
        },
      ],
    });
    editing.value = null;
  } catch (e) {
    if (e instanceof ApiError && e.body.code === 'VERSION_CONFLICT') {
      await load();
    }
    errorMsg.value = e instanceof ApiError ? messageText(e.messageKey) : t('common.unknownError');
  } finally {
    editBusy.value = false;
  }
}

async function confirmAll() {
  if (confirmBusy.value || !results.value) return;
  confirmBusy.value = true;
  errorMsg.value = '';
  try {
    results.value = await reviewCells(props.jobId, {
      expected_version: results.value.version,
      confirm: true,
    });
    notice.value = t('result.reviewDone');
  } catch (e) {
    if (e instanceof ApiError && e.body.code === 'VERSION_CONFLICT') {
      await load();
    }
    errorMsg.value = e instanceof ApiError ? messageText(e.messageKey) : t('common.unknownError');
  } finally {
    confirmBusy.value = false;
  }
}

async function doExport(format: 'XLSX' | 'CSV' | 'TXT') {
  if (exportBusy.value) return;
  exportBusy.value = format;
  errorMsg.value = '';
  try {
    const exp = await createExport(props.jobId, format);
    // 下载走同源 cookie 鉴权（无匿名签名 URL）
    window.open(exportDownloadUrl(exp.id), '_blank');
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? messageText(e.messageKey) : t('common.unknownError');
  } finally {
    exportBusy.value = '';
  }
}

async function rerun() {
  errorMsg.value = '';
  try {
    const job = await rerunJob(props.jobId);
    navigate('processing', { jobId: job.id });
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? messageText(e.messageKey) : t('common.unknownError');
  }
}

async function removeResults() {
  errorMsg.value = '';
  try {
    await deleteJob(props.jobId);
    goTab('history');
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? messageText(e.messageKey) : t('common.unknownError');
  }
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'tables', label: 'result.tabs' },
  { key: 'text', label: 'result.tabText' },
  { key: 'fields', label: 'result.tabFields' },
  { key: 'original', label: 'result.tabOriginal' },
];
</script>

<template>
  <div class="result">
    <PageHeader :title="job?.file_name || '…'" @back="goTab('history')" />

    <div v-if="errorMsg && !results" class="fatal">
      <p class="status-error">{{ errorMsg }}</p>
      <button class="home-btn" @click="goTab('history')">{{ t('common.back') }}</button>
    </div>

    <template v-else-if="results">
      <div class="summary">
        <div class="chips">
          <StatusChip v-if="job" :status="job.status" />
          <span class="review-chip" :class="results.review_status.toLowerCase()">
            <span class="dot" />
            {{ t(`job.review.${results.review_status}`) }}
          </span>
        </div>
        <div class="meta">
          {{ t('result.meta', { pages: job?.page_count ?? results.page_count, tables: results.table_count }) }}
          · {{ t('result.updatedAt', { time: formatTime(job?.finished_at ?? job?.created_at ?? null) }) }}
        </div>
      </div>

      <!-- 页签 -->
      <div class="tabs">
        <button
          v-for="item in TABS"
          :key="item.key"
          class="tab"
          :class="{ active: tab === item.key }"
          @click="tab = item.key"
        >
          {{ t(item.label) }}
        </button>
      </div>

      <div class="tab-content">
        <!-- 表格 -->
        <template v-if="tab === 'tables'">
          <div v-if="!currentPage || currentPage.tables.length === 0" class="empty-state">
            {{ t('common.empty') }}
          </div>
          <div
            v-for="(table, ti) in currentPage?.tables ?? []"
            :key="table.table_id"
            class="table-card"
          >
            <div class="table-head">
              <span class="table-title">
                {{ t('result.tableTitle', { n: ti + 1, page: currentPage?.page_number ?? 1 }) }}
              </span>
              <span class="table-meta">
                {{ t('result.tableMeta', { rows: table.row_count, cols: table.column_count }) }}
              </span>
            </div>
            <div class="grid" :style="{ gridTemplateColumns: `repeat(${table.column_count}, minmax(72px, 1fr))` }">
              <button
                v-for="(cell, i) in table.cells"
                :key="i"
                class="cell"
                :class="{
                  head: cell.row_index === 0,
                  edited: cell.review_status === 'EDITED',
                  confirmed: cell.review_status === 'CONFIRMED',
                }"
                @click="openEditor(table, cell)"
              >
                {{ cell.current_text }}
              </button>
            </div>
          </div>
          <div class="hint">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4A66F7" stroke-width="2" stroke-linecap="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            <span>{{ t('result.cellHint') }}</span>
          </div>
          <button
            v-if="results.review_status !== 'CONFIRMED'"
            class="confirm-btn"
            :disabled="confirmBusy"
            @click="confirmAll"
          >
            {{ confirmBusy ? t('common.loading') : t('common.confirm') }}
          </button>
        </template>

        <!-- 文字 -->
        <template v-else-if="tab === 'text'">
          <div class="pager">
            <button
              v-for="p in results.pages"
              :key="p.page_number"
              class="page-pill"
              :class="{ active: activePage === p.page_number }"
              @click="activePage = p.page_number"
            >
              {{ p.page_number }}
            </button>
          </div>
          <div class="text-card">
            <pre>{{ currentPage?.text || t('result.fullTextEmpty') }}</pre>
          </div>
        </template>

        <!-- 字段 -->
        <template v-else-if="tab === 'fields'">
          <div v-if="!currentPage || currentPage.fields.length === 0" class="empty-state">
            {{ t('result.fieldsEmpty') }}
          </div>
          <div v-else class="fields-card">
            <div v-for="f in currentPage.fields" :key="f.name" class="field-row">
              <span class="field-key">{{ f.name }}</span>
              <span class="field-value">{{ f.value }}</span>
            </div>
          </div>
        </template>

        <!-- 原件 -->
        <template v-else>
          <div class="pager">
            <button
              v-for="p in results.pages"
              :key="p.page_number"
              class="page-pill"
              :class="{ active: activePage === p.page_number }"
              @click="activePage = p.page_number"
            >
              {{ p.page_number }}
            </button>
          </div>
          <img
            v-if="job"
            class="original"
            :src="filePagePreviewUrl(job.file_id, activePage)"
            :alt="job.file_name"
          />
        </template>
      </div>

      <p v-if="notice" class="notice">{{ notice }}</p>
      <p v-if="errorMsg" class="status-error">{{ errorMsg }}</p>

      <!-- 底部操作 -->
      <div class="actions">
        <button class="export-primary" :disabled="!!exportBusy" @click="doExport('XLSX')">
          {{ exportBusy ? t('export.creating') : t('result.exportExcel') }}
        </button>
        <div class="export-secondary">
          <button :disabled="!!exportBusy" @click="doExport('CSV')">{{ t('result.exportCsv') }}</button>
          <button :disabled="!!exportBusy" @click="doExport('TXT')">{{ t('result.exportTxt') }}</button>
        </div>
        <div class="job-ops">
          <button class="op-btn" @click="rerun">{{ t('result.rerun') }}</button>
          <button class="op-btn danger" @click="removeResults">{{ t('result.delete') }}</button>
        </div>
      </div>
    </template>

    <div v-else class="fatal"><p>{{ t('common.loading') }}</p></div>

    <!-- 单元格编辑弹层 -->
    <div v-if="editing" class="modal-mask" @click.self="editing = null">
      <div class="modal">
        <div class="modal-title">
          {{ t('result.tableTitle', { n: 1, page: editing.pageNumber }) }} ·
          R{{ editing.cell.row_index + 1 }}C{{ editing.cell.column_index + 1 }}
        </div>
        <textarea v-model="editText" class="modal-input" rows="3" />
        <div class="modal-actions">
          <button class="modal-cancel" @click="editing = null">{{ t('common.cancel') }}</button>
          <button class="modal-save" :disabled="editBusy" @click="saveEdit">
            {{ editBusy ? t('common.loading') : t('common.save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.result {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.fatal {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 24px;
}

.summary {
  padding: 2px 20px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chips {
  display: flex;
  gap: 8px;
  align-items: center;
}

.review-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--track);
  color: var(--icon);
  font-size: 9px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
}

.review-chip .dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--text-secondary);
}

.review-chip.confirmed {
  background: var(--success-bg);
  color: var(--success);
}

.review-chip.confirmed .dot {
  background: var(--success);
}

.meta {
  font-size: 11px;
  color: var(--text-secondary);
}

.tabs {
  display: flex;
  gap: 20px;
  padding: 0 20px;
  border-bottom: 1px solid var(--border);
}

.tab {
  font-size: 12px;
  color: var(--text-secondary);
  padding: 10px 2px;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  font-weight: 600;
}

.tab.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.tab-content {
  flex: 1;
  padding: 14px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.empty-state {
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
  padding: 32px 0;
}

.table-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
}

.table-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
}

.table-title {
  font-size: 12px;
  font-weight: 700;
}

.table-meta {
  font-size: 10px;
  color: var(--text-secondary);
}

.grid {
  display: grid;
  overflow-x: auto;
}

.cell {
  min-height: 36px;
  padding: 8px 10px;
  font-size: 10px;
  color: var(--text);
  text-align: left;
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  background: var(--card);
  overflow-wrap: anywhere;
}

.cell.head {
  background: var(--track);
  color: var(--icon);
  font-weight: 600;
}

.cell.edited {
  background: #fff8e6;
}

.cell.confirmed {
  background: var(--success-bg);
}

.hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: var(--text-secondary);
}

.confirm-btn {
  height: 42px;
  border-radius: 12px;
  background: var(--primary-light);
  color: var(--primary);
  font-size: 12px;
  font-weight: 700;
}

.confirm-btn:disabled {
  opacity: 0.6;
}

.pager {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.page-pill {
  min-width: 32px;
  height: 32px;
  border-radius: 999px;
  background: var(--card);
  border: 1px solid var(--border);
  font-size: 11px;
  font-weight: 600;
  color: var(--icon);
}

.page-pill.active {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}

.text-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 14px 16px;
}

.text-card pre {
  margin: 0;
  font-family: inherit;
  font-size: 11px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.fields-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
}

.field-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.field-row:last-child {
  border-bottom: none;
}

.field-key {
  font-size: 11px;
  font-weight: 600;
  color: var(--icon);
}

.field-value {
  font-size: 11px;
  color: var(--text);
  text-align: right;
  overflow-wrap: anywhere;
}

.original {
  width: 100%;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--card);
}

.notice {
  margin: 0;
  padding: 0 20px;
  font-size: 11px;
  color: var(--success);
  text-align: center;
}

.status-error {
  margin: 0;
  padding: 0 20px;
  text-align: center;
  font-size: 12px;
  color: var(--danger);
}

.actions {
  padding: 12px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-top: 1px solid var(--border);
  background: var(--bg);
}

.export-primary {
  height: 53px;
  border-radius: 14px;
  background: var(--primary);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.export-primary:disabled {
  opacity: 0.6;
}

.export-secondary {
  display: flex;
  gap: 10px;
}

.export-secondary button {
  flex: 1;
  height: 44px;
  border-radius: 12px;
  background: var(--card);
  border: 1px solid var(--border);
  font-size: 12px;
  font-weight: 600;
  color: var(--icon);
}

.job-ops {
  display: flex;
  gap: 10px;
}

.op-btn {
  flex: 1;
  height: 40px;
  border-radius: 12px;
  background: var(--card);
  border: 1px solid var(--border);
  font-size: 12px;
  font-weight: 600;
  color: var(--icon);
}

.op-btn.danger {
  color: var(--danger);
}

.home-btn {
  height: 44px;
  padding: 0 24px;
  border-radius: 12px;
  background: var(--primary-light);
  color: var(--primary);
  font-size: 12px;
  font-weight: 700;
}

.modal-mask {
  position: absolute;
  inset: 0;
  background: rgba(23, 26, 28, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 20;
}

.modal {
  width: 100%;
  background: var(--card);
  border-radius: 20px 20px 0 0;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--icon);
}

.modal-input {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  outline: none;
}

.modal-input:focus {
  border-color: var(--primary);
}

.modal-actions {
  display: flex;
  gap: 10px;
}

.modal-cancel {
  flex: 1;
  height: 46px;
  border-radius: 12px;
  background: var(--track);
  color: var(--icon);
  font-size: 13px;
  font-weight: 700;
}

.modal-save {
  flex: 1;
  height: 46px;
  border-radius: 12px;
  background: var(--primary);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.modal-save:disabled {
  opacity: 0.6;
}
</style>
