import { useEffect, useRef, useState } from 'react'
import { Empty, Image, Skeleton, Space, Tag, Typography } from 'antd'
import * as pdfjsLib from 'pdfjs-dist'
import { useI18n } from '../i18n'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Vite ?url 导入返回字符串
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc

interface Props {
  /** 当前上传的 File 对象；与 mode='file' 配合使用 */
  file?: File | null
  /** 历史记录的文件 URL（后端 /extractions/{id}/file）；与 mode='history' 配合使用 */
  fileUrl?: string | null
  /** 文件名（用于元信息展示） */
  filename?: string
}

type RenderState =
  | { kind: 'loading' }
  | { kind: 'unsupported'; reason: string }
  | { kind: 'image'; src: string }
  | { kind: 'pdf'; dataUrl: string }
  | { kind: 'meta'; contentType: string; size: number }

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function isImageType(ct: string): boolean {
  return ct.startsWith('image/') && ct !== 'image/svg+xml'
}

function isPdfType(ct: string, name: string): boolean {
  return ct === 'application/pdf' || name.toLowerCase().endsWith('.pdf')
}

export default function FilePreview({ file, fileUrl, filename }: Props) {
  const { t } = useI18n()
  const [state, setState] = useState<RenderState>({ kind: 'loading' })
  const objectUrlRef = useRef<string | null>(null)
  const fetchedUrlRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setState({ kind: 'loading' })

    async function resolve() {
      try {
        let blob: Blob
        let name = filename ?? 'file'
        if (file) {
          blob = file
          name = file.name
        } else if (fileUrl) {
          const resp = await fetch(fileUrl)
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
          blob = await resp.blob()
        } else {
          setState({ kind: 'unsupported', reason: t('preview.noFile') })
          return
        }

        if (cancelled) return

        const ct = blob.type || 'application/octet-stream'
        if (isImageType(ct)) {
          const url = URL.createObjectURL(blob)
          objectUrlRef.current = url
          setState({ kind: 'image', src: url })
          return
        }
        if (isPdfType(ct, name)) {
          const arrayBuf = await blob.arrayBuffer()
          if (cancelled) return
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuf })
          const pdf = await loadingTask.promise
          const page = await pdf.getPage(1)
          const viewport = page.getViewport({ scale: 1.0 })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          const ctx = canvas.getContext('2d')
          if (!ctx) throw new Error('canvas 2d context unavailable')
          await page.render({ canvasContext: ctx, viewport, canvas }).promise
          const dataUrl = canvas.toDataURL('image/png')
          if (cancelled) return
          setState({ kind: 'pdf', dataUrl })
          return
        }
        setState({ kind: 'meta', contentType: ct, size: blob.size })
      } catch (e) {
        const reason = e instanceof Error ? e.message : String(e)
        setState({ kind: 'unsupported', reason })
      }
    }

    resolve()
    return () => {
      cancelled = true
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [file, fileUrl, filename])

  // 单独 useEffect 释放 fetchedUrl（如果以后切换到 blob URL 缓存）
  useEffect(() => {
    return () => {
      if (fetchedUrlRef.current) URL.revokeObjectURL(fetchedUrlRef.current)
    }
  }, [])

  if (state.kind === 'loading') {
    return (
      <div style={{ padding: 12 }}>
        <Skeleton.Image active style={{ width: 240, height: 180 }} />
      </div>
    )
  }
  if (state.kind === 'unsupported') {
    return <Empty description={t('preview.cannot', { reason: state.reason })} />
  }
  if (state.kind === 'image') {
    return (
      <Image
        src={state.src}
        alt={filename ?? t('preview.alt')}
        style={{
          maxWidth: '100%',
          maxHeight: 320,
          objectFit: 'contain',
          background: '#fafafa',
          borderRadius: 4,
          border: '1px solid #eee',
        }}
        preview={{
          mask: t('preview.zoom'),
          src: state.src,
        }}
      />
    )
  }
  if (state.kind === 'pdf') {
    return (
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {t('preview.pdfThumb')}
        </Typography.Text>
        <Image
          src={state.dataUrl}
          alt={filename ?? t('preview.pdfAlt')}
          style={{
            maxWidth: '100%',
            maxHeight: 320,
            objectFit: 'contain',
            background: '#fff',
            borderRadius: 4,
            border: '1px solid #eee',
          }}
          preview={{
            mask: t('preview.zoom'),
            src: state.dataUrl,
          }}
        />
      </Space>
    )
  }
  // meta
  return (
    <Space size={4}>
      <Tag color="blue">{state.contentType || 'unknown'}</Tag>
      <Typography.Text>{formatSize(state.size || 0)}</Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {t('preview.noThumb')}
      </Typography.Text>
    </Space>
  )
}
