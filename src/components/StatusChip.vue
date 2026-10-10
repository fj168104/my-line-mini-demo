<script setup lang="ts">
import { useT } from '../i18nVue';

const { t } = useT();

defineProps<{
  status: string;
}>();

const SUCCESS = new Set(['SUCCEEDED']);
const PROCESSING = new Set(['QUEUED', 'PREPROCESSING', 'PROCESSING', 'POSTPROCESSING', 'CANCEL_REQUESTED']);
</script>

<template>
  <span
    class="chip"
    :class="{
      success: SUCCESS.has(status),
      processing: PROCESSING.has(status),
      failed: status === 'FAILED' || status === 'CANCELLED',
    }"
  >
    {{ t(`job.status.${status}`) }}
  </span>
</template>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 600;
  white-space: nowrap;
}

.chip.success {
  background: var(--success-bg);
  color: var(--success);
}

.chip.processing {
  background: var(--processing-bg);
  color: var(--processing);
}

.chip.failed {
  background: #fdeaea;
  color: var(--danger);
}
</style>
