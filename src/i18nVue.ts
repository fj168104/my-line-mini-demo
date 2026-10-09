/**
 * i18n 的 Vue 适配层。
 * locale 是 customRef：模板中读取会建立响应式依赖，语言切换后所有用到 t() 的组件自动重渲染。
 */
import { customRef } from 'vue';
import {
  getLocale,
  setLocale,
  t as tRaw,
  type Locale,
  type Params,
} from './i18n';

export const locale = customRef<Locale>((track, trigger) => ({
  get() {
    track();
    return getLocale();
  },
  set(v: Locale) {
    setLocale(v);
    trigger();
  },
}));

/** 在组件中使用：const { t } = useT(); 模板里 {{ t('login.title') }} */
export function useT(): {
  locale: ReturnType<typeof customRef<Locale>>;
  t: (key: string, params?: Params) => string;
} {
  return {
    locale,
    t: (key: string, params?: Params) => {
      void locale.value; // 建立响应式依赖，切换语言时触发重渲染
      return tRaw(key, params);
    },
  };
}
