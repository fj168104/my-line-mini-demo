/**
 * 三段式上传流程：预检 → PUT 内容 → complete。
 * 成功后返回 READY 状态的 FileInfo。
 */
import { completeUpload, createUpload, uploadContent, type FileInfo } from './api';

export async function uploadFile(file: File): Promise<FileInfo> {
  const { file: created, upload_id: uploadId } = await createUpload(file.name, file.size);
  try {
    await uploadContent(uploadId, file, file.type || 'application/octet-stream');
    const { file: ready } = await completeUpload(uploadId);
    return ready;
  } catch (e) {
    // 上传失败时尽力而为地保留文件记录（后端可重新 PUT 修复），错误继续上抛
    throw e;
  }
}

export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}
