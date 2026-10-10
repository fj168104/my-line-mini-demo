<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useT } from '../i18nVue';
import LangSwitch from '../components/LangSwitch.vue';

const { t } = useT();

const props = withDefaults(
  defineProps<{ mode?: 'sync' | 'async' }>(),
  { mode: 'sync' },
);

const emit = defineEmits<{
  (e: 'back'): void;
}>();

/**
 * React 子应用挂载点。
 * mount.tsx 中会把 ReactDOM.createRoot 挂到这个 div，
 * 并把 id 设为 'textin-ocr-root' 以让 styles.css 中的隔离选择器生效。
 */
const hostRef = ref<HTMLDivElement | null>(null);
let unmount: (() => void) | null = null;

onMounted(async () => {
  // 动态 import：仅在打开 TextIn OCR 视图时才加载 React + Antd + pdfjs ~500 KB。
  const mod = await import('../textin-ocr/mount');
  if (hostRef.value) {
    unmount = mod.mountTextinOcr(hostRef.value, props.mode);
  }
});

onBeforeUnmount(() => {
  unmount?.();
  unmount = null;
});
</script>

<template>
  <main class="page">
    <header class="topbar">
      <button class="ghost" type="button" @click="emit('back')">{{ t('page.back') }}</button>
      <h1>{{ props.mode === 'async' ? t('page.textinAsyncTitle') : t('page.textinTitle') }}</h1>
      <span class="spacer" />
    </header>
    <LangSwitch />

    <!-- React 子应用挂到这里；styles.css 通过 #textin-ocr-root 选择器做样式隔离 -->
    <div ref="hostRef" class="react-host" />
  </main>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f6fa;
  color: #1a1a2e;
}

.topbar {
  display: flex;
  align-items: center;
  padding: 14px 24px;
  background: #fff;
  border-bottom: 1px solid #eee;
  box-shadow: 0 2px 8px rgb(0 0 0 / 4%);
}

.topbar h1 {
  margin: 0;
  font-size: 18px;
  flex: 1;
  text-align: center;
}

.spacer {
  width: 60px;
}

.ghost {
  padding: 8px 14px;
  border: 1px solid #d8d8e6;
  border-radius: 8px;
  background: #fff;
  color: #4a6cf7;
  font-size: 14px;
  cursor: pointer;
}

.ghost:hover {
  background: #f0f3ff;
}

.react-host {
  /* React 子应用自带 Layout minHeight:100vh，从这里向下接管 */
  min-height: calc(100vh - 60px);
}
</style>
