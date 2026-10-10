/**
 * 轻量双语 i18n（英文默认 / 泰文，PRD §17；默认语言按需求定为英文）。
 * - Vue 适配：src/i18nVue.ts（customRef 让 t() 在模板中响应语言切换）
 * - 语言持久化在 localStorage['app_lang']，默认英文
 */

export type Locale = 'en' | 'th';
export type Params = Record<string, string | number>;

const LANG_KEY = 'app_lang';

function detectInitial(): Locale {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'en' || saved === 'th') return saved;
  } catch {
    /* localStorage 不可用时用默认值 */
  }
  return 'en';
}

let current: Locale = detectInitial();
document.documentElement.lang = current;

const listeners = new Set<() => void>();

/** 当前语言 */
export function getLocale(): Locale {
  return current;
}

/** 切换语言并持久化 */
export function setLocale(l: Locale): void {
  if (l === current) return;
  current = l;
  try {
    localStorage.setItem(LANG_KEY, l);
  } catch {
    /* ignore */
  }
  document.documentElement.lang = l;
  listeners.forEach((fn) => fn());
}

/** 订阅语言变化，返回取消订阅函数 */
export function subscribeLocale(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

type Dict = Record<string, string>;

const en: Dict = {
  // 通用
  'common.loading': 'Loading…',
  'common.retry': 'Retry',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.confirm': 'Confirm',
  'common.delete': 'Delete',
  'common.done': 'Done',
  'common.back': 'Back',
  'common.unknownError': 'Unknown error',
  'common.search': 'Search',
  'common.empty': 'Nothing here yet',

  // P01 启动页
  'boot.connecting': 'Connecting to LINE…',
  'boot.poweredBy': 'Powered by LINE MINI App',

  // 登录
  'login.withLine': 'Login with LINE',
  'login.devTitle': 'Developer sign-in',
  'login.devHint': 'Local development fallback (server AUTH_DEV_MODE must be on)',
  'login.devPlaceholder': 'Dev ID',
  'login.devSubmit': 'Sign in',
  'login.failed': 'Sign-in failed',

  // 底部导航
  'nav.scan': 'SCAN',
  'nav.history': 'HISTORY',
  'nav.my': 'MY',

  // P02 扫描主页
  'home.recent': 'Recent tasks',
  'home.importUrl': 'Import from URL',
  'home.urlPlaceholder': 'https://example.com/invoice.pdf',
  'home.urlSubmit': 'Import',
  'home.camera': 'Camera',
  'home.photos': 'Photos',
  'home.files': 'Files',
  'home.pickHint': 'JPG / PNG / PDF, up to {size}MB',
  'home.workspacePersonal': 'Personal',
  'home.uploading': 'Uploading… {pct}%',

  // 任务状态
  'job.status.QUEUED': 'Queued',
  'job.status.PREPROCESSING': 'Preprocessing',
  'job.status.PROCESSING': 'Processing',
  'job.status.POSTPROCESSING': 'Post-processing',
  'job.status.SUCCEEDED': 'Completed',
  'job.status.PARTIAL_SUCCESS': 'Partial success',
  'job.status.FAILED': 'Failed',
  'job.status.CANCEL_REQUESTED': 'Cancelling',
  'job.status.CANCELLED': 'Cancelled',
  'job.review.UNREVIEWED': 'Unreviewed',
  'job.review.EDITED': 'Edited',
  'job.review.CONFIRMED': 'Confirmed',

  // P03 确认文档
  'confirm.title': 'Confirm document',
  'confirm.pageOf': '{n} / {total}',

  // P04 识别设置
  'settings.title': 'Recognition settings',
  'settings.content': 'CONTENT',
  'settings.modeBoth': 'Text + tables',
  'settings.modeBothSub': 'Best for receipts and invoices',
  'settings.modeText': 'Text only',
  'settings.modeTextSub': 'Lightweight and faster',
  'settings.document': 'DOCUMENT',
  'settings.language': 'Document language',
  'settings.languageAuto': 'Auto (TH / EN)',
  'settings.pages': 'Pages',
  'settings.pagesAll': 'All {n} pages',
  'settings.fieldExtraction': 'Field extraction',
  'settings.fieldTemplate': 'General receipt template',
  'settings.advanced': 'Advanced settings',
  'settings.advancedSub': 'Auto parse · Deskew · Formulas off',
  'settings.submitAs': 'Submit as',
  'settings.start': 'Start processing',

  // P05 处理中
  'processing.title': 'Processing',
  'processing.recognizing': 'Recognizing tables…',
  'processing.step.UPLOADED': 'Uploaded',
  'processing.step.PREPROCESSING': 'Preprocessing',
  'processing.step.PROCESSING': 'Processing',
  'processing.step.POSTPROCESSING': 'Post-processing',
  'processing.info': 'You can leave this page — the task keeps running in the background. Track it in History.',
  'processing.backHome': 'Back to home',
  'processing.cancelTask': 'Cancel task',
  'processing.cancelConfirm': 'Cancel this task?',

  // P06 结果详情
  'result.tabs': 'Tables',
  'result.tabText': 'Text',
  'result.tabFields': 'Fields',
  'result.tabOriginal': 'Original',
  'result.tableTitle': 'Table {n} · Page {page}',
  'result.tableMeta': '{rows} rows × {cols} cols',
  'result.cellHint': 'Tap a cell to review against the original',
  'result.exportExcel': 'Export Excel',
  'result.exportCsv': 'Export CSV',
  'result.exportTxt': 'Export TXT',
  'result.reviewDone': 'Review completed',
  'result.editedBadge': 'Edited',
  'result.fullTextEmpty': 'No text on this page',
  'result.fieldsEmpty': 'No fields extracted',
  'result.updatedAt': 'Updated {time}',
  'result.meta': '{pages} pages · {tables} tables',
  'result.rerun': 'Re-run',
  'result.delete': 'Delete results',

  // P07 历史
  'history.title': 'History',
  'history.searchPlaceholder': 'Search file name',
  'history.filter.all': 'All',
  'history.filter.completed': 'Completed',
  'history.filter.processing': 'Processing',
  'history.filter.failed': 'Failed',
  'history.empty': 'No tasks yet',

  // P08 我的
  'my.title': 'My account',
  'my.lineConnected': 'LINE account connected',
  'my.company': 'My company',
  'my.companyEmpty': 'No verified company yet',
  'my.companyApply': 'Verify company',
  'my.language': 'Language',
  'my.logout': 'Sign out',
  'my.loggingOut': 'Signing out…',

  // 导出
  'export.creating': 'Preparing export…',
  'export.ready': 'Export ready',
  'export.failed': 'Export failed',

  // 后端 message_key → 用户文案（error 兜底在 err.*）
  'err.auth.login_required': 'Please sign in',
  'err.auth.session_expired': 'Session expired, please sign in again',
  'err.auth.session_revoked': 'Session revoked, please sign in again',
  'err.auth.account_disabled': 'Account disabled',
  'err.auth.line_token_invalid': 'LINE sign-in failed, please try again',
  'err.auth.line_token_expired': 'LINE sign-in expired, please try again',
  'err.auth.line_not_configured': 'LINE login is not available',
  'err.auth.line_init_failed': 'Could not reach LINE. Please try again.',
  'err.error.csrf_invalid': 'Security token expired, please retry',
  'err.error.not_found': 'Not found or no access',
  'err.error.permission_denied': 'No permission',
  'err.error.state_conflict': 'Status changed, please refresh',
  'err.error.version_conflict': 'Someone else edited this, please refresh',
  'err.error.rate_limited': 'Too many requests, please wait',
  'err.error.invalid_argument': 'Invalid input',
  'err.files.unsupported_type': 'Unsupported file type',
  'err.files.too_large': 'File too large',
  'err.files.too_many_pages': 'Too many pages',
  'err.files.disguised_type': 'File content does not match its extension',
  'err.files.corrupt_or_encrypted': 'PDF is corrupt or encrypted',
  'err.file_import.invalid_url': 'Invalid URL',
  'err.file_import.fetch_failed': 'Failed to fetch the file',
  'err.job.file_not_ready': 'File is not ready yet',
  'err.job.page_out_of_range': 'Page out of range',
  'err.job.page_count_exceeded': 'Too many pages selected',
  'err.job.already_terminal': 'Task already finished',
  'err.job.not_terminal': 'Task is still running',
  'err.export.expired': 'Export expired, please export again',
};

const th: Dict = {
  // 通用
  'common.loading': 'กำลังโหลด…',
  'common.retry': 'ลองอีกครั้ง',
  'common.cancel': 'ยกเลิก',
  'common.save': 'บันทึก',
  'common.confirm': 'ยืนยัน',
  'common.delete': 'ลบ',
  'common.done': 'เสร็จสิ้น',
  'common.back': 'ย้อนกลับ',
  'common.unknownError': 'ข้อผิดพลาดที่ไม่ทราบสาเหตุ',
  'common.search': 'ค้นหา',
  'common.empty': 'ยังไม่มีข้อมูล',

  // P01 启动页
  'boot.connecting': 'กำลังเชื่อมต่อ LINE…',
  'boot.poweredBy': 'ขับเคลื่อนโดย LINE MINI App',

  // 登录
  'login.withLine': 'เข้าสู่ระบบด้วย LINE',
  'login.devTitle': 'เข้าสู่ระบบสำหรับนักพัฒนา',
  'login.devHint': 'ทางลัดสำหรับพัฒนาในเครื่อง (ต้องเปิด AUTH_DEV_MODE ฝั่งเซิร์ฟเวอร์)',
  'login.devPlaceholder': 'Dev ID',
  'login.devSubmit': 'เข้าสู่ระบบ',
  'login.failed': 'เข้าสู่ระบบไม่สำเร็จ',

  // 底部导航
  'nav.scan': 'SCAN',
  'nav.history': 'HISTORY',
  'nav.my': 'MY',

  // P02 扫描主页
  'home.recent': 'งานล่าสุด',
  'home.importUrl': 'นำเข้าจาก URL',
  'home.urlPlaceholder': 'https://example.com/invoice.pdf',
  'home.urlSubmit': 'นำเข้า',
  'home.camera': 'กล้อง',
  'home.photos': 'รูปภาพ',
  'home.files': 'ไฟล์',
  'home.pickHint': 'JPG / PNG / PDF ไม่เกิน {size}MB',
  'home.workspacePersonal': 'ส่วนตัว',
  'home.uploading': 'กำลังอัปโหลด… {pct}%',

  // 任务状态
  'job.status.QUEUED': 'รอคิว',
  'job.status.PREPROCESSING': 'กำลังเตรียมข้อมูล',
  'job.status.PROCESSING': 'กำลังประมวลผล',
  'job.status.POSTPROCESSING': 'กำลังหลังประมวลผล',
  'job.status.SUCCEEDED': 'เสร็จสิ้น',
  'job.status.PARTIAL_SUCCESS': 'สำเร็จบางส่วน',
  'job.status.FAILED': 'ล้มเหลว',
  'job.status.CANCEL_REQUESTED': 'กำลังยกเลิก',
  'job.status.CANCELLED': 'ยกเลิกแล้ว',
  'job.review.UNREVIEWED': 'ยังไม่ตรวจสอบ',
  'job.review.EDITED': 'แก้ไขแล้ว',
  'job.review.CONFIRMED': 'ยืนยันแล้ว',

  // P03 确认文档
  'confirm.title': 'ยืนยันเอกสาร',
  'confirm.pageOf': '{n} / {total}',

  // P04 识别设置
  'settings.title': 'ตั้งค่าการจดจำ',
  'settings.content': 'เนื้อหา',
  'settings.modeBoth': 'ข้อความ + ตาราง',
  'settings.modeBothSub': 'เหมาะกับใบเสร็จและใบแจ้งหนี้',
  'settings.modeText': 'เฉพาะข้อความ',
  'settings.modeTextSub': 'เบากว่าและเร็วกว่า',
  'settings.document': 'เอกสาร',
  'settings.language': 'ภาษาของเอกสาร',
  'settings.languageAuto': 'อัตโนมัติ (TH / EN)',
  'settings.pages': 'หน้า',
  'settings.pagesAll': 'ทั้งหมด {n} หน้า',
  'settings.fieldExtraction': 'การดึงฟิลด์',
  'settings.fieldTemplate': 'เทมเพลตใบเสร็จทั่วไป',
  'settings.advanced': 'ตั้งค่าขั้นสูง',
  'settings.advancedSub': 'แยกวิเคราะห์อัตโนมัติ · แก้ภาพเอียง · ปิดสูตร',
  'settings.submitAs': 'ส่งในนาม',
  'settings.start': 'เริ่มประมวลผล',

  // P05 处理中
  'processing.title': 'กำลังประมวลผล',
  'processing.recognizing': 'กำลังจดจำตาราง…',
  'processing.step.UPLOADED': 'อัปโหลดแล้ว',
  'processing.step.PREPROCESSING': 'เตรียมข้อมูล',
  'processing.step.PROCESSING': 'ประมวลผล',
  'processing.step.POSTPROCESSING': 'หลังประมวลผล',
  'processing.info': 'คุณสามารถออกจากหน้านี้ได้ งานจะยังคงทำงานต่อในเบื้องหลัง ติดตามได้ในประวัติ',
  'processing.backHome': 'กลับหน้าหลัก',
  'processing.cancelTask': 'ยกเลิกงาน',
  'processing.cancelConfirm': 'ยกเลิกงานนี้หรือไม่?',

  // P06 结果详情
  'result.tabs': 'ตาราง',
  'result.tabText': 'ข้อความ',
  'result.tabFields': 'ฟิลด์',
  'result.tabOriginal': 'ต้นฉบับ',
  'result.tableTitle': 'ตาราง {n} · หน้า {page}',
  'result.tableMeta': '{rows} แถว × {cols} คอลัมน์',
  'result.cellHint': 'แตะเซลล์เพื่อตรวจสอบกับต้นฉบับ',
  'result.exportExcel': 'ส่งออก Excel',
  'result.exportCsv': 'ส่งออก CSV',
  'result.exportTxt': 'ส่งออก TXT',
  'result.reviewDone': 'ตรวจสอบเสร็จสิ้น',
  'result.editedBadge': 'แก้ไขแล้ว',
  'result.fullTextEmpty': 'ไม่มีข้อความในหน้านี้',
  'result.fieldsEmpty': 'ไม่มีฟิลด์ที่สกัดได้',
  'result.updatedAt': 'อัปเดต {time}',
  'result.meta': '{pages} หน้า · {tables} ตาราง',
  'result.rerun': 'เรียกใหม่',
  'result.delete': 'ลบผลลัพธ์',

  // P07 历史
  'history.title': 'ประวัติ',
  'history.searchPlaceholder': 'ค้นหาชื่อไฟล์',
  'history.filter.all': 'ทั้งหมด',
  'history.filter.completed': 'เสร็จสิ้น',
  'history.filter.processing': 'กำลังประมวลผล',
  'history.filter.failed': 'ล้มเหลว',
  'history.empty': 'ยังไม่มีงาน',

  // P08 我的
  'my.title': 'บัญชีของฉัน',
  'my.lineConnected': 'เชื่อมต่อบัญชี LINE แล้ว',
  'my.company': 'บริษัทของฉัน',
  'my.companyEmpty': 'ยังไม่มีบริษัทที่ยืนยันแล้ว',
  'my.companyApply': 'ยืนยันบริษัท',
  'my.language': 'ภาษา',
  'my.logout': 'ออกจากระบบ',
  'my.loggingOut': 'กำลังออกจากระบบ…',

  // 导出
  'export.creating': 'กำลังเตรียมไฟล์…',
  'export.ready': 'พร้อมส่งออกแล้ว',
  'export.failed': 'ส่งออกไม่สำเร็จ',

  // 后端 message_key → 用户文案
  'err.auth.login_required': 'กรุณาเข้าสู่ระบบ',
  'err.auth.session_expired': 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง',
  'err.auth.session_revoked': 'เซสชันถูกยกเลิก กรุณาเข้าสู่ระบบอีกครั้ง',
  'err.auth.account_disabled': 'บัญชีถูกปิดใช้งาน',
  'err.auth.line_token_invalid': 'เข้าสู่ระบบ LINE ไม่สำเร็จ กรุณาลองอีกครั้ง',
  'err.auth.line_token_expired': 'การเข้าสู่ระบบ LINE หมดอายุ กรุณาลองอีกครั้ง',
  'err.auth.line_not_configured': 'ไม่พบการตั้งค่าเข้าสู่ระบบ LINE',
  'err.auth.line_init_failed': 'เชื่อมต่อ LINE ไม่สำเร็จ กรุณาลองอีกครั้ง',
  'err.error.csrf_invalid': 'โทเคนความปลอดภัยหมดอายุ กรุณาลองใหม่',
  'err.error.not_found': 'ไม่พบข้อมูลหรือไม่มีสิทธิ์เข้าถึง',
  'err.error.permission_denied': 'ไม่มีสิทธิ์ดำเนินการ',
  'err.error.state_conflict': 'สถานะเปลี่ยนแปลง กรุณารีเฟรช',
  'err.error.version_conflict': 'มีผู้อื่นแก้ไขข้อมูลนี้ กรุณารีเฟรช',
  'err.error.rate_limited': 'คำขอถี่เกินไป กรุณารอสักครู่',
  'err.error.invalid_argument': 'ข้อมูลไม่ถูกต้อง',
  'err.files.unsupported_type': 'ประเภทไฟล์ไม่รองรับ',
  'err.files.too_large': 'ไฟล์ใหญ่เกินไป',
  'err.files.too_many_pages': 'จำนวนหน้าเกินกำหนด',
  'err.files.disguised_type': 'เนื้อหาไฟล์ไม่ตรงกับนามสกุล',
  'err.files.corrupt_or_encrypted': 'ไฟล์ PDF เสียหรือถูกเข้ารหัส',
  'err.file_import.invalid_url': 'URL ไม่ถูกต้อง',
  'err.file_import.fetch_failed': 'ดึงไฟล์ไม่สำเร็จ',
  'err.job.file_not_ready': 'ไฟล์ยังไม่พร้อม',
  'err.job.page_out_of_range': 'เลขหน้าเกินขอบเขต',
  'err.job.page_count_exceeded': 'จำนวนหน้าที่เลือกเกินกำหนด',
  'err.job.already_terminal': 'งานนี้จบไปแล้ว',
  'err.job.not_terminal': 'งานยังทำงานอยู่',
  'err.export.expired': 'ไฟล์ส่งออกหมดอายุ กรุณาส่งออกใหม่',
};

const dicts: Record<Locale, Dict> = { en, th };

/** 翻译：t('home.recent') / t('confirm.pageOf', { n: 1, total: 8 }) */
export function t(key: string, params?: Params): string {
  const dict = dicts[current];
  let s = dict[key] ?? en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.split(`{${k}}`).join(String(v));
    }
  }
  return s;
}

/** 后端 message_key → 本地文案（带 err. 前缀查表，缺失时兜底通用错误） */
export function messageText(messageKey: string): string {
  return t(`err.${messageKey}`) !== `err.${messageKey}` ? t(`err.${messageKey}`) : t('common.unknownError');
}
