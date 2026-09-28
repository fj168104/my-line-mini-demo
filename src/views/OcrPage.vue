<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  recognizeImage,
  uploadImageUrl,
  type OcrBlock,
  type OcrResult,
} from '../api';

const emit = defineEmits<{
  (e: 'back'): void;
}>();

type Phase = 'idle' | 'loading' | 'done' | 'error';

const phase = ref<Phase>('idle');
const errorMsg = ref('');
const result = ref<OcrResult | null>(null);
const fileName = ref('');
const fileInput = ref<HTMLInputElement | null>(null);
const dragOver = ref(false);

async function handleFile(file: File) {
  // 简单校验类型
  if (!file.type.startsWith('image/')) {
    errorMsg.value = '请上传图片文件';
    phase.value = 'error';
    return;
  }
  fileName.value = file.name;
  phase.value = 'loading';
  errorMsg.value = '';
  try {
    result.value = await recognizeImage(file);
    phase.value = 'done';
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '识别失败';
    phase.value = 'error';
  }
}

function onInputChange(e: Event) {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) handleFile(file);
  // 重置 input，允许重复选同一文件
  target.value = '';
}

function onDrop(e: DragEvent) {
  dragOver.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) handleFile(file);
}

function reset() {
  phase.value = 'idle';
  result.value = null;
  errorMsg.value = '';
  fileName.value = '';
}

function copyText() {
  if (result.value?.full_text) {
    navigator.clipboard.writeText(cleanText(result.value.full_text));
  }
}

/** 清洗后的识别全文（去掉装饰符号） */
const cleanFullText = computed(() =>
  result.value ? cleanText(result.value.full_text) : '',
);

// ===== 表格重建：根据 OCR 块坐标聚类出行 / 列，绘制表格线 =====

interface GBox {
  idx: number;
  text: string;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  cx: number;
  cy: number;
  w: number;
  h: number;
  confidence: number;
  isCell: boolean;
  isHeader: boolean;
  isCode: boolean;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface HLine {
  x1: number;
  x2: number;
  y: number;
}

interface VLine {
  x: number;
  y1: number;
  y2: number;
}

interface Geometry {
  boxes: GBox[];
  hLines: HLine[];
  vLines: VLine[];
  headerRects: Rect[];
}

/** 判断文本是否像代码（等宽字体显示） */
function looksLikeCode(text: string): boolean {
  return /(\(|\)|=|\[|\]|len\s*\(|append|remove|\bL\b)/.test(text);
}

/**
 * 清洗 OCR 识别出的文字：去掉装饰性符号（星星、箭头、emoji 等），
 * 保留中文、英文、数字、代码符号与空白。
 */
function cleanText(text: string): string {
  return text.replace(
    /[^\u4e00-\u9fa5a-zA-Z0-9\s\[\](){}<>=+\-*/%^&|!?.,:;'"#@$~_\\]/g,
    '',
  );
}

function toBoxes(blocks: OcrBlock[]): GBox[] {
  const result: GBox[] = [];
  blocks.forEach((b, i) => {
    const text = cleanText(b.text);
    if (!text.trim()) return; // 纯装饰符号块跳过
    const xs = b.vertices.map((v) => v.x);
    const ys = b.vertices.map((v) => v.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    result.push({
      idx: i,
      text,
      minX,
      minY,
      maxX,
      maxY,
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
      w: maxX - minX,
      h: maxY - minY,
      confidence: b.confidence,
      isCell: false,
      isHeader: false,
      isCode: looksLikeCode(text),
    });
  });
  return result;
}

/**
 * 按垂直区间重叠把块聚成行（同一行的单元格 y 区间重叠 >= 50%）。
 * 返回按 y 排序的行，每行内按 x 排序。
 */
function clusterRows(boxes: GBox[]): GBox[][] {
  const rows: GBox[][] = [];
  const sorted = [...boxes].sort((a, b) => a.cy - b.cy);
  for (const box of sorted) {
    let bestRow: GBox[] | null = null;
    let bestOverlap = 0;
    for (const row of rows) {
      const rowTop = Math.min(...row.map((c) => c.minY));
      const rowBottom = Math.max(...row.map((c) => c.maxY));
      const overlap =
        Math.min(box.maxY, rowBottom) - Math.max(box.minY, rowTop);
      const minH = Math.min(box.h, rowBottom - rowTop);
      if (minH > 0 && overlap >= 0.5 * minH && overlap > bestOverlap) {
        bestOverlap = overlap;
        bestRow = row;
      }
    }
    if (bestRow) {
      bestRow.push(box);
    } else {
      rows.push([box]);
    }
  }
  rows.sort((a, b) => a[0].cy - b[0].cy);
  rows.forEach((r) => r.sort((a, b) => a.cx - b.cx));
  return rows;
}

/** 两个文本的字符相似度（字符多重集交集 / 较长串长度） */
function charSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const count = (s: string): Map<string, number> => {
    const m = new Map<string, number>();
    for (const ch of s) m.set(ch, (m.get(ch) ?? 0) + 1);
    return m;
  };
  const ca = count(a);
  const cb = count(b);
  let common = 0;
  ca.forEach((n, ch) => {
    common += Math.min(n, cb.get(ch) ?? 0);
  });
  return common / Math.max(a.length, b.length);
}

/**
 * 去除高度重叠且文本近似的重复块（同一文字被识别出两份时保留置信度高者）。
 */
function dedupeBoxes(boxes: GBox[]): GBox[] {
  const kept: GBox[] = [];
  const sorted = [...boxes].sort((a, b) => b.confidence - a.confidence);
  for (const box of sorted) {
    const isDup = kept.some((k) => {
      const ix = Math.min(box.maxX, k.maxX) - Math.max(box.minX, k.minX);
      const iy = Math.min(box.maxY, k.maxY) - Math.max(box.minY, k.minY);
      if (ix <= 0 || iy <= 0) return false;
      const inter = ix * iy;
      const iou = inter / (box.w * box.h + k.w * k.h - inter);
      if (iou < 0.45) return false;
      const t1 = box.text.replace(/\s+/g, '');
      const t2 = k.text.replace(/\s+/g, '');
      return (
        t1 === t2 ||
        t1.includes(t2) ||
        t2.includes(t1) ||
        charSimilarity(t1, t2) >= 0.7
      );
    });
    if (!isDup) kept.push(box);
  }
  return kept;
}

/**
 * 列边界检测：对每一行内相邻块的中点投票，
 * 在多行中都出现的相近 x 位置才是真正的列分隔线。
 * 比单纯 x 轴投影更鲁棒：即使两列文字紧贴（中间只有竖线），
 * 只要每行在该处都有块间间隙，就能检测到列分隔。
 */
function detectColumnEdges(
  boxes: GBox[],
  imageWidth: number,
): number[] {
  if (!boxes.length) return [0, imageWidth];

  // 行聚类（局部复用，避免依赖外部 rows）
  const rows: GBox[][] = [];
  for (const box of [...boxes].sort((a, b) => a.cy - b.cy)) {
    let bestRow: GBox[] | null = null;
    let bestOverlap = 0;
    for (const row of rows) {
      const rowTop = Math.min(...row.map((c) => c.minY));
      const rowBottom = Math.max(...row.map((c) => c.maxY));
      const overlap =
        Math.min(box.maxY, rowBottom) - Math.max(box.minY, rowTop);
      const minH = Math.min(box.h, rowBottom - rowTop);
      if (minH > 0 && overlap >= 0.5 * minH && overlap > bestOverlap) {
        bestOverlap = overlap;
        bestRow = row;
      }
    }
    if (bestRow) bestRow.push(box);
    else rows.push([box]);
  }

  // 收集所有"多块行"的相邻块中点作为候选列分隔
  const candidates: number[] = [];
  for (const row of rows) {
    if (row.length < 2) continue;
    const sorted = [...row].sort((a, b) => a.cx - b.cx);
    for (let k = 1; k < sorted.length; k += 1) {
      const gap = sorted[k].minX - sorted[k - 1].maxX;
      // 间隙至少 8px 才算列分隔候选（太近可能是同单元格内的多字）
      if (gap >= 8) {
        candidates.push((sorted[k - 1].maxX + sorted[k].minX) / 2);
      }
    }
  }

  if (candidates.length === 0) return [0, imageWidth];

  // 对候选位置聚类：间距 < imgW*0.04 的归为同一列分隔
  const tol = Math.max(imageWidth * 0.04, 30);
  candidates.sort((a, b) => a - b);
  const clusters: number[][] = [[candidates[0]]];
  for (let k = 1; k < candidates.length; k += 1) {
    const last = clusters[clusters.length - 1];
    const clusterCenter = last.reduce((s, v) => s + v, 0) / last.length;
    if (Math.abs(candidates[k] - clusterCenter) <= tol) {
      last.push(candidates[k]);
    } else {
      clusters.push([candidates[k]]);
    }
  }

  // 只保留投票数 >= 2 的列分隔（至少两行都在此处分隔）
  const votedEdges = clusters
    .filter((c) => c.length >= 2)
    .map((c) => c.reduce((s, v) => s + v, 0) / c.length);

  return [0, ...votedEdges, imageWidth];
}

/**
 * 检测表格：用 x 轴投影确定列边界，连续多行落入相同列数的归为同一张表。
 */
function buildGeometry(r: OcrResult): Geometry {
  const boxes = dedupeBoxes(toBoxes(r.blocks));
  const rows = clusterRows(boxes);
  const imageWidth = r.image_width || 0;

  const hLines: HLine[] = [];
  const vLines: VLine[] = [];
  const headerRects: Rect[] = [];
  const mergedCellIdxs = new Set<number>();
  const mergedCells: GBox[] = [];

  // 全图所有块参与列边界检测（对表格类内容，非表格块也只会落在某列内）
  const colEdges = detectColumnEdges(boxes, imageWidth);
  const colCount = colEdges.length - 1;

  const colOf = (box: GBox): number => {
    for (let c = 0; c < colCount; c += 1) {
      if (box.cx >= colEdges[c] && box.cx <= colEdges[c + 1]) return c;
    }
    return -1;
  };

  const multiRows = rows.filter((row) => row.length >= 2);
  if (multiRows.length && colCount >= 2) {
    // 一行至少匹配 max(2, 列数-1) 个列才算表格行
    const need = Math.max(2, colCount - 1);
    // 合并同一行同一列的多个块（如"方"+"法"被拆成两块时合并）
    const rowMatches = rows.map((row) => {
      const matched = new Map<number, GBox>();
      for (const cell of row) {
        const col = colOf(cell);
        if (col < 0) continue;
        const existing = matched.get(col);
        if (!existing) {
          matched.set(col, { ...cell });
        } else {
          // 合并：x 取并集，文本按 x 排序拼接
          const cells = [existing, cell].sort((a, b) => a.minX - b.minX);
          const merged: GBox = {
            ...existing,
            text: cells.map((c) => c.text).join(''),
            minX: Math.min(existing.minX, cell.minX),
            maxX: Math.max(existing.maxX, cell.maxX),
            minY: Math.min(existing.minY, cell.minY),
            maxY: Math.max(existing.maxY, cell.maxY),
            cx: (Math.min(existing.minX, cell.minX) + Math.max(existing.maxX, cell.maxX)) / 2,
            cy: (Math.min(existing.minY, cell.minY) + Math.max(existing.maxY, cell.maxY)) / 2,
            w: Math.max(existing.maxX, cell.maxX) - Math.min(existing.minX, cell.minX),
            h: Math.max(existing.maxY, cell.maxY) - Math.min(existing.minY, cell.minY),
            confidence: Math.max(existing.confidence, cell.confidence),
          };
          matched.set(col, merged);
        }
      }
      return matched;
    });
    const isTableRow = rows.map((_, i) => rowMatches[i].size >= need);

    // 收集被合并进表格的原始块 idx（渲染时用合并块替换）
    rows.forEach((row, ri) => {
      if (!isTableRow[ri]) return;
      for (const cell of row) {
        if (colOf(cell) >= 0) mergedCellIdxs.add(cell.idx);
      }
    });

    // 连续的表格行分组
    let i = 0;
    while (i < rows.length) {
      if (!isTableRow[i]) {
        i += 1;
        continue;
      }
      const group: number[] = [];
      while (i < rows.length && isTableRow[i]) {
        group.push(i);
        i += 1;
      }
      if (group.length < 1) continue;

      const tableCells: GBox[] = [];
      const colBuckets: Map<number, GBox[]> = new Map();
      group.forEach((ri) => {
        rowMatches[ri].forEach((cell, col) => {
          cell.isCell = true;
          tableCells.push(cell);
          mergedCells.push(cell);
          if (!colBuckets.has(col)) colBuckets.set(col, []);
          colBuckets.get(col)!.push(cell);
        });
      });
      // 第一行视为表头
      group[0] !== undefined &&
        rowMatches[group[0]].forEach((cell) => {
          cell.isHeader = true;
        });

      // 行上下边界
      const rowTops = group.map((ri) =>
        Math.min(...rows[ri].map((c) => c.minY)),
      );
      const rowBottoms = group.map((ri) =>
        Math.max(...rows[ri].map((c) => c.maxY)),
      );
      const outerLeft = Math.min(...tableCells.map((c) => c.minX));
      const outerRight = Math.max(...tableCells.map((c) => c.maxX));

      // 横线：首行顶、行间中点、末行底
      const yLines = [rowTops[0]];
      for (let k = 1; k < group.length; k += 1) {
        yLines.push((rowBottoms[k - 1] + rowTops[k]) / 2);
      }
      yLines.push(rowBottoms[group.length - 1]);
      yLines.forEach((y) => hLines.push({ x1: outerLeft, x2: outerRight, y }));

      // 竖线：用检测出的列边界（裁剪到表格左右边界内）
      const tableTop = rowTops[0];
      const tableBottom = rowBottoms[group.length - 1];
      for (let c = 0; c <= colCount; c += 1) {
        const x = Math.max(outerLeft, Math.min(outerRight, colEdges[c]));
        vLines.push({ x, y1: tableTop, y2: tableBottom });
      }

      // 把每个表格单元格的宽度扩展到所在列的实际宽度（避免文字因块窄而换行）
      group.forEach((ri) => {
        rowMatches[ri].forEach((cell, col) => {
          const colLeft = Math.max(outerLeft, colEdges[col]);
          const colRight = Math.min(outerRight, colEdges[col + 1] ?? outerRight);
          cell.minX = colLeft;
          cell.maxX = colRight;
          cell.w = colRight - colLeft;
          cell.cx = (colLeft + colRight) / 2;
        });
      });

      // 表头底色区域：高度为首行顶到第一条行间横线（铺满整个表头单元格）
      const headerBottom =
        yLines.length > 1 ? yLines[1] : rowBottoms[0];
      headerRects.push({
        x: outerLeft,
        y: rowTops[0],
        w: outerRight - outerLeft,
        h: headerBottom - rowTops[0],
      });
    }
  }

  // 渲染用的 boxes：表格内的原始块用合并后的块替换，非表格块保留
  const renderBoxes = boxes.filter((b) => !mergedCellIdxs.has(b.idx));
  renderBoxes.push(...mergedCells);

  return { boxes: renderBoxes, hLines, vLines, headerRects };
}

// ===== 响应式缩放：坐标按容器实际像素宽度换算 =====

const canvasRef = ref<HTMLDivElement | null>(null);
const canvasWidth = ref(600);
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  // canvasRef 在识别完成后才渲染，这里仅做兜底
  attachObserver();
});

// canvasRef 出现时（进入结果页）绑定 ResizeObserver，销毁时断开
watch(canvasRef, (el) => {
  if (el) {
    attachObserver();
  } else {
    resizeObserver?.disconnect();
    resizeObserver = null;
  }
});

function attachObserver() {
  if (!canvasRef.value || resizeObserver) return;
  resizeObserver = new ResizeObserver((entries) => {
    const w = entries[0]?.contentRect.width;
    if (w) canvasWidth.value = w;
  });
  resizeObserver.observe(canvasRef.value);
}

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});

const geometry = computed<Geometry | null>(() =>
  result.value ? buildGeometry(result.value) : null,
);

const scale = computed(() => {
  const w = result.value?.image_width || 0;
  return w ? canvasWidth.value / w : 1;
});

const canvasHeight = computed(() => {
  if (!result.value) return 0;
  return (result.value.image_height || 0) * scale.value;
});

function px(v: number): string {
  return `${v * scale.value}px`;
}

/** 文字块定位样式（字号自适应块宽，避免被挤换行） */
function boxStyle(b: GBox): Record<string, string> {
  // 字号基准：块高的 0.72
  const byHeight = Math.max(9, b.h * scale.value * 0.72);
  // 字号上限：块宽能容纳的字宽（中文字约为正方形，英文更窄，取 0.55em/字）
  const charCount = Math.max(1, b.text.replace(/\s/g, '').length);
  const byWidth = (b.w * scale.value) / charCount / 0.62;
  const fontSize = Math.min(byHeight, byWidth);
  return {
    left: px(b.minX),
    top: px(b.minY),
    width: px(b.w),
    height: px(b.h),
    fontSize: `${fontSize}px`,
  };
}

function lineStyleH(l: HLine): Record<string, string> {
  return {
    left: px(l.x1),
    width: px(l.x2 - l.x1),
    top: px(l.y),
  };
}

function lineStyleV(l: VLine): Record<string, string> {
  return {
    left: px(l.x),
    top: px(l.y1),
    height: px(l.y2 - l.y1),
  };
}

function rectStyle(r: Rect): Record<string, string> {
  return {
    left: px(r.x),
    top: px(r.y),
    width: px(r.w),
    height: px(r.h),
  };
}
</script>

<template>
  <main class="page">
    <header class="topbar">
      <button class="ghost" @click="emit('back')">← 返回</button>
      <h1>OCR 识别</h1>
      <span class="spacer" />
    </header>

    <section class="content" :class="{ wide: phase === 'done' }">
      <!-- 空闲：上传 -->
      <div
        v-if="phase === 'idle'"
        class="dropzone"
        :class="{ over: dragOver }"
        @dragover.prevent="dragOver = true"
        @dragleave="dragOver = false"
        @drop.prevent="onDrop"
        @click="fileInput?.click()"
      >
        <div class="dz-icon">📷</div>
        <p class="dz-title">点击或拖拽图片到此处</p>
        <p class="dz-hint">支持 PNG / JPG / JPEG / WEBP，最大 10MB</p>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          hidden
          @change="onInputChange"
        />
      </div>

      <!-- 加载中 -->
      <div v-else-if="phase === 'loading'" class="state-box">
        <div class="spinner" />
        <p>正在识别「{{ fileName }}」，请稍候…</p>
      </div>

      <!-- 错误 -->
      <div v-else-if="phase === 'error'" class="state-box">
        <p class="err">{{ errorMsg }}</p>
        <button class="btn" @click="reset">重新上传</button>
      </div>

      <!-- 结果：左原图 / 右表格重建 -->
      <div v-else-if="phase === 'done' && result && geometry" class="result">
        <div class="result-toolbar">
          <button class="btn" @click="copyText">复制全文</button>
          <button class="ghost" @click="reset">识别新图</button>
        </div>

        <div class="panels">
          <!-- 左：原始图片 -->
          <div class="panel">
            <p class="panel-label">原始图片</p>
            <div class="panel-frame">
              <img
                :src="uploadImageUrl(result.image_url)"
                class="origin-img"
                alt="原图"
              />
            </div>
          </div>

          <!-- 右：识别结果（表格重建） -->
          <div class="panel">
            <p class="panel-label">识别结果</p>
            <div ref="canvasRef" class="recon-canvas" :style="{ height: canvasHeight + 'px' }">
              <!-- 表头底色 -->
              <div
                v-for="(r, i) in geometry.headerRects"
                :key="'hr' + i"
                class="head-bg"
                :style="rectStyle(r)"
              />
              <!-- 表格横线 -->
              <div
                v-for="(l, i) in geometry.hLines"
                :key="'hl' + i"
                class="grid-line-h"
                :style="lineStyleH(l)"
              />
              <!-- 表格竖线 -->
              <div
                v-for="(l, i) in geometry.vLines"
                :key="'vl' + i"
                class="grid-line-v"
                :style="lineStyleV(l)"
              />
              <!-- 文字 -->
              <div
                v-for="b in geometry.boxes"
                :key="b.idx"
                class="doc-text"
                :class="{ cell: b.isCell, head: b.isHeader, code: b.isCode }"
                :style="boxStyle(b)"
                :title="`置信度 ${b.confidence}`"
              >
                {{ b.text }}
              </div>
            </div>
          </div>
        </div>

        <details class="full-text">
          <summary>识别全文（可复制）</summary>
          <pre>{{ cleanFullText }}</pre>
        </details>
      </div>
    </section>
  </main>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f6fa;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
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

.content {
  max-width: 800px;
  margin: 0 auto;
  padding: 32px 20px;
}

.content.wide {
  max-width: 1360px;
}

.dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  border: 2px dashed #b8c2e6;
  border-radius: 16px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
}

.dropzone.over {
  border-color: #4a6cf7;
  background: #f0f3ff;
}

.dz-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.dz-title {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 600;
}

.dz-hint {
  margin: 0;
  color: #8a8a9a;
  font-size: 13px;
}

.state-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  margin-bottom: 16px;
  border: 4px solid #e0e0ec;
  border-top-color: #4a6cf7;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.err {
  color: #e74c3c;
  margin-bottom: 16px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: #4a6cf7;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.btn:hover {
  background: #3a5ce5;
}

.result {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 20px rgb(0 0 0 / 6%);
}

.result-toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 18px;
}

/* ===== 左右分栏 ===== */
.panels {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.panel {
  flex: 1 1 0;
  min-width: 360px;
}

.panel-label {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: #5a5a72;
  text-align: center;
}

.panel-frame {
  border: 1px solid #e3e6f0;
  border-radius: 10px;
  overflow: hidden;
  background: #fafbff;
}

.origin-img {
  display: block;
  width: 100%;
  height: auto;
}

/* ===== 右侧识别结果画布 ===== */
.recon-canvas {
  position: relative;
  border: 1px solid #e3e6f0;
  border-radius: 10px;
  background: #fff;
  overflow: hidden;
}

.head-bg {
  position: absolute;
  background: #d6deff;
  z-index: 0;
}

.grid-line-h,
.grid-line-v {
  position: absolute;
  background: #7f92d8;
  z-index: 1;
}

.grid-line-h {
  height: 1.4px;
}

.grid-line-v {
  width: 1.4px;
}

.doc-text {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0 4px;
  color: #1a1a2e;
  line-height: 1.15;
  text-align: left;
  white-space: pre-wrap;
  word-break: break-word;
  box-sizing: border-box;
  overflow: hidden;
  z-index: 2;
}

/* 表格单元格：居中 */
.doc-text.cell {
  justify-content: center;
  text-align: center;
  padding: 2px 6px;
}

/* 表头：白字加粗 */
.doc-text.head {
  color: #2b3a67;
  font-weight: 700;
}

/* 代码样式的单元格用等宽字体 */
.doc-text.code {
  font-family: ui-monospace, 'Cascadia Code', Consolas, 'Courier New', monospace;
}

.full-text {
  margin-top: 20px;
  border-top: 1px solid #eee;
  padding-top: 16px;
}

.full-text summary {
  cursor: pointer;
  font-size: 14px;
  color: #4a6cf7;
  font-weight: 600;
}

.full-text pre {
  margin: 12px 0 0;
  padding: 16px;
  background: #f5f6fa;
  border-radius: 8px;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 14px;
  line-height: 1.6;
  max-height: 300px;
  overflow: auto;
}

@media (max-width: 900px) {
  .panel {
    min-width: 100%;
  }
}
</style>
