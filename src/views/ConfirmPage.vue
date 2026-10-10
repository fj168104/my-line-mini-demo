<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ApiError, filePagePreviewUrl, getFile, type FileInfo } from '../api';
import { messageText } from '../i18n';
import { useT } from '../i18nVue';
import { navigate } from '../store';
import PageHeader from '../components/PageHeader.vue';

const { t } = useT();

const props = defineProps<{
  fileId: string;
}>();

const file = ref<FileInfo | null>(null);
const errorMsg = ref('');

onMounted(async () => {
  try {
    const { file: f } = await getFile(props.fileId);
    file.value = f;
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? messageText(e.messageKey) : t('common.unknownError');
  }
});

function goSettings() {
  navigate('settings', { fileId: props.fileId });
}
</script>

<template>
  <div class="confirm">
    <PageHeader :title="t('confirm.title')" @back="navigate('scan')" />

    <div class="content">
      <p v-if="errorMsg" class="status-error">{{ errorMsg }}</p>
      <template v-else-if="file">
        <div class="preview-wrap">
          <!-- 图片返回本体，PDF 由服务端渲染成 PNG，统一走页预览接口 -->
          <img class="preview" :src="filePagePreviewUrl(file.id, 1)" :alt="file.original_name" />
          <div class="page-badge">{{ t('confirm.pageOf', { n: 1, total: file.page_count || 1 }) }}</div>
        </div>

        <div class="file-summary">
          <div class="file-name">{{ file.original_name }}</div>
          <div class="file-meta">{{ t('result.meta', { pages: file.page_count, tables: 0 }) }}</div>
        </div>

        <button class="primary-btn" @click="goSettings">{{ t('settings.title') }}</button>
      </template>
      <p v-else class="status-loading">{{ t('common.loading') }}</p>
    </div>
  </div>
</template>

<style scoped>
.confirm {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.content {
  padding: 8px 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preview-wrap {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  background: var(--track);
  border: 1px solid var(--border);
}

.preview {
  display: block;
  width: 100%;
  max-height: 300px;
  object-fit: contain;
}

.page-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(23, 26, 28, 0.72);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
}

.file-summary {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 14px 16px;
}

.file-name {
  font-size: 13px;
  font-weight: 700;
}

.file-meta {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 3px;
}

.primary-btn {
  height: 53px;
  border-radius: 14px;
  background: var(--primary);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.status-loading,
.status-error {
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
}

.status-error {
  color: var(--danger);
}
</style>
