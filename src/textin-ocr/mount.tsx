import { createRoot, type Root } from 'react-dom/client'
import App from './App'
import './styles.css'

/**
 * 把 TextIn OCR React 子应用挂载到指定 DOM 节点。
 * 由 Vue 视图 TextinOcrPage.vue 通过动态 import 加载，
 * 卸载时调用返回的 unmount 函数清理 React 树。
 */
export function mountTextinOcr(host: HTMLElement): () => void {
  // 挂载点 id 必须在 styles.css 中作为隔离选择器，避免 Antd reset 渗到 Vue。
  host.id = 'textin-ocr-root'
  const root: Root = createRoot(host)
  root.render(<App />)
  return () => {
    root.unmount()
  }
}
