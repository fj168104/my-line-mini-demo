/**
 * i18n 的 React 适配层：语言变化时触发组件重渲染。
 */
import { useSyncExternalStore } from 'react'
import {
  getLocale,
  subscribeLocale,
  t as tRaw,
  type Locale,
  type Params,
} from '../i18n'

export function useI18n(): {
  locale: Locale
  t: (key: string, params?: Params) => string
} {
  const loc = useSyncExternalStore(subscribeLocale, getLocale)
  return { locale: loc, t: tRaw }
}
