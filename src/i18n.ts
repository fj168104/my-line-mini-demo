/**
 * 轻量双语 i18n（英文 / 泰文），框架无关核心。
 * - Vue 适配：src/i18nVue.ts（customRef 让 t() 在模板中响应语言切换）
 * - React 适配：src/textin-ocr/i18n.ts（useSyncExternalStore）
 * - 语言持久化在 localStorage['app_lang']，默认英文
 */

export type Locale = 'en' | 'th'
export type Params = Record<string, string | number>

const LANG_KEY = 'app_lang'

function detectInitial(): Locale {
  try {
    const saved = localStorage.getItem(LANG_KEY)
    if (saved === 'en' || saved === 'th') return saved
  } catch {
    /* localStorage 不可用时用默认值 */
  }
  return 'en'
}

let current: Locale = detectInitial()

const listeners = new Set<() => void>()

/** 当前语言 */
export function getLocale(): Locale {
  return current
}

/** 切换语言并持久化 */
export function setLocale(l: Locale): void {
  if (l === current) return
  current = l
  try {
    localStorage.setItem(LANG_KEY, l)
  } catch {
    /* ignore */
  }
  document.documentElement.lang = l
  listeners.forEach((fn) => fn())
}

/** 订阅语言变化（React 用），返回取消订阅函数 */
export function subscribeLocale(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

type Dict = Record<string, string>

const en: Dict = {
  // 通用
  'common.loading': 'Loading…',
  'common.unknownError': 'Unknown error',

  // 登录页
  'login.title': 'User Login',
  'login.subtitle': 'SaiFlow User Center',
  'login.account': 'Account',
  'login.accountPh': 'Username or email',
  'login.password': 'Password',
  'login.passwordPh': 'Enter your password',
  'login.submit': 'Sign in',
  'login.submitting': 'Signing in…',
  'login.noAccount': 'No account yet?',
  'login.registerNow': 'Register now',
  'login.hint': 'Demo account: bob / Password: Pass1234',
  'login.errRequired': 'Please enter account and password',
  'login.errFailed': 'Sign-in failed',

  // 注册页
  'register.title': 'Create Account',
  'register.subtitle': 'Create your SaiFlow account',
  'register.username': 'Username',
  'register.usernamePh': 'Enter username',
  'register.email': 'Email',
  'register.emailPh': 'Enter email',
  'register.password': 'Password',
  'register.passwordPh': 'At least 6 characters',
  'register.confirm': 'Confirm password',
  'register.confirmPh': 'Enter password again',
  'register.submit': 'Sign up',
  'register.submitting': 'Signing up…',
  'register.haveAccount': 'Already have an account?',
  'register.backToLogin': 'Back to sign in',
  'register.errRequired': 'Username, email and password are required',
  'register.errEmail': 'Invalid email format',
  'register.errPwdLen': 'Password must be at least 6 characters',
  'register.errPwdMatch': 'Passwords do not match',
  'register.success': 'Registered! Redirecting to sign in…',
  'register.errFailed': 'Sign-up failed',

  // 用户信息页
  'user.userId': 'User ID',
  'user.createdAt': 'Registered at',
  'user.ocrPhoto': 'OCR Image Recognition',
  'user.ocrSmart': 'OCR Smart Extraction',
  'user.logout': 'Sign out',
  'user.loggingOut': 'Signing out…',
  'user.loadFailed': 'Failed to load user info',

  // Vue 页面骨架
  'page.back': '← Back',
  'page.textinTitle': 'OCR Smart Extraction',

  // React 子应用骨架
  'app.headerTitle': 'SaiFlow OCR — Smart Extraction',
  'app.cardUpload': '1. Upload / Submit',
  'app.cardResult': '2. Extraction Result',
  'app.cardHistory': '3. History',

  // 抽取表单
  'form.tabFile': 'Local file',
  'form.tabUrl': 'URL input',
  'form.dropText': 'Click or drag file to this area',
  'form.dropHint': 'JPG / PNG / PDF supported, max 20MB per file',
  'form.parseMode': 'Parse mode',
  'form.modeScan': 'scan (accurate)',
  'form.modeLayout': 'layout (layout analysis)',
  'form.modeArticle': 'article (reading mode)',
  'form.table': 'Table recognition',
  'form.formula': 'Formula recognition',
  'form.rotate': 'Rotation correction',
  'form.startPage': 'Start page',
  'form.pageCount': 'Pages to process',
  'form.fields': 'Fields to extract',
  'form.fieldsTooltip':
    'Press Enter to confirm; leave empty for heuristic extraction (less accurate)',
  'form.fieldsPh': 'e.g. invoice no., amount, date',
  'form.start': 'Start extraction',
  'form.warnSelectFile': 'Please select a file first',
  'form.warnInputUrl': 'Please enter a URL',
  'form.done': 'Extraction done: extraction_id={id}',

  // 结果面板
  'result.empty': 'Results will appear here after submission',
  'result.colPage': 'Page',
  'result.colSource': 'Source',
  'result.schemaExact': 'schema exact',
  'result.colField': 'Field name',
  'result.clickEdit': 'Click to edit',
  'result.custom': 'Custom',
  'result.colValue': 'Value',
  'result.pages': 'Pages',
  'result.items': 'Elements',
  'result.fields': 'Extracted fields',
  'result.duration': 'Duration (ms)',
  'result.tabFields': 'Fields ({n})',
  'result.emptyFields': 'No field/value pairs matched in this extraction',
  'result.tabMarkdown': 'Markdown',
  'result.emptyMd': 'No markdown output',
  'result.tabElements': 'Elements ({n})',
  'result.emptyElements': 'No elements',
  'result.pageOf': 'Page {n}',
  'result.noText': '(no text, e.g. image-only element)',
  'result.tabPages': 'Pages ({n})',
  'result.emptyPages': 'No page data',
  'result.tabRaw': 'Full JSON',

  // 历史记录
  'history.colType': 'Type',
  'history.colSource': 'Source',
  'history.colPages': 'Pages',
  'history.colItems': 'Items',
  'history.colFields': 'Fields',
  'history.colCreatedAt': 'Created at',
  'history.colAction': 'Actions',
  'history.view': 'View',
  'history.empty': 'No extraction records yet',
  'history.loadFail': 'Failed to load history: {msg}',
  'history.viewFail': 'Failed to load record: {msg}',

  // 文件预览
  'preview.noFile': 'No file to preview',
  'preview.cannot': 'Cannot preview: {reason}',
  'preview.alt': 'preview',
  'preview.zoom': 'Click to zoom',
  'preview.pdfThumb': 'PDF first-page thumbnail',
  'preview.pdfAlt': 'PDF preview',
  'preview.noThumb': '(no thumbnail)',

  // API 兜底文案
  'api.requestFailed': 'Request failed',
  'api.emptyResponse': 'Empty response',
  'api.bizError': 'Business error (code={code})',
}

const th: Dict = {
  // 通用
  'common.loading': 'กำลังโหลด…',
  'common.unknownError': 'ข้อผิดพลาดที่ไม่ทราบสาเหตุ',

  // 登录页
  'login.title': 'เข้าสู่ระบบ',
  'login.subtitle': 'ศูนย์บัญชีผู้ใช้ SaiFlow',
  'login.account': 'บัญชีผู้ใช้',
  'login.accountPh': 'ชื่อผู้ใช้หรืออีเมล',
  'login.password': 'รหัสผ่าน',
  'login.passwordPh': 'กรุณากรอกรหัสผ่าน',
  'login.submit': 'เข้าสู่ระบบ',
  'login.submitting': 'กำลังเข้าสู่ระบบ…',
  'login.noAccount': 'ยังไม่มีบัญชีใช่ไหม?',
  'login.registerNow': 'สมัครสมาชิก',
  'login.hint': 'บัญชีทดลอง: bob / รหัสผ่าน: Pass1234',
  'login.errRequired': 'กรุณากรอกบัญชีผู้ใช้และรหัสผ่าน',
  'login.errFailed': 'เข้าสู่ระบบไม่สำเร็จ',

  // 注册页
  'register.title': 'สมัครสมาชิก',
  'register.subtitle': 'สร้างบัญชี SaiFlow ของคุณ',
  'register.username': 'ชื่อผู้ใช้',
  'register.usernamePh': 'กรุณากรอกชื่อผู้ใช้',
  'register.email': 'อีเมล',
  'register.emailPh': 'กรุณากรอกอีเมล',
  'register.password': 'รหัสผ่าน',
  'register.passwordPh': 'อย่างน้อย 6 ตัวอักษร',
  'register.confirm': 'ยืนยันรหัสผ่าน',
  'register.confirmPh': 'กรอกรหัสผ่านอีกครั้ง',
  'register.submit': 'สมัครสมาชิก',
  'register.submitting': 'กำลังสมัครสมาชิก…',
  'register.haveAccount': 'มีบัญชีอยู่แล้วใช่ไหม?',
  'register.backToLogin': 'กลับไปเข้าสู่ระบบ',
  'register.errRequired': 'กรุณากรอกชื่อผู้ใช้ อีเมล และรหัสผ่าน',
  'register.errEmail': 'รูปแบบอีเมลไม่ถูกต้อง',
  'register.errPwdLen': 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
  'register.errPwdMatch': 'รหัสผ่านทั้งสองช่องไม่ตรงกัน',
  'register.success': 'สมัครสำเร็จ กำลังไปหน้าเข้าสู่ระบบ…',
  'register.errFailed': 'สมัครสมาชิกไม่สำเร็จ',

  // 用户信息页
  'user.userId': 'รหัสผู้ใช้',
  'user.createdAt': 'วันที่สมัคร',
  'user.ocrPhoto': 'OCR จดจำรูปภาพ',
  'user.ocrSmart': 'OCR สกัดข้อมูลอัจฉริยะ',
  'user.logout': 'ออกจากระบบ',
  'user.loggingOut': 'กำลังออกจากระบบ…',
  'user.loadFailed': 'โหลดข้อมูลผู้ใช้ไม่สำเร็จ',

  // Vue 页面骨架
  'page.back': '← ย้อนกลับ',
  'page.textinTitle': 'OCR สกัดข้อมูลอัจฉริยะ',

  // React 子应用骨架
  'app.headerTitle': 'SaiFlow OCR — สกัดข้อมูลอัจฉริยะ',
  'app.cardUpload': '1. อัปโหลด / ส่งคำขอ',
  'app.cardResult': '2. ผลการสกัด',
  'app.cardHistory': '3. ประวัติ',

  // 抽取表单
  'form.tabFile': 'ไฟล์ในเครื่อง',
  'form.tabUrl': 'ป้อน URL',
  'form.dropText': 'คลิกหรือลากไฟล์มาที่บริเวณนี้',
  'form.dropHint': 'รองรับ JPG / PNG / PDF ไม่เกินไฟล์ละ 20MB',
  'form.parseMode': 'โหมดแยกวิเคราะห์',
  'form.modeScan': 'scan (แม่นยำ)',
  'form.modeLayout': 'layout (วิเคราะห์เลย์เอาต์)',
  'form.modeArticle': 'article (โหมดบทความ)',
  'form.table': 'จดจำตาราง',
  'form.formula': 'จดจำสูตร',
  'form.rotate': 'แก้ภาพที่เอียง',
  'form.startPage': 'หน้าเริ่มต้น',
  'form.pageCount': 'จำนวนหน้า',
  'form.fields': 'ฟิลด์ที่ต้องการสกัด',
  'form.fieldsTooltip':
    'กด Enter เพื่อยืนยัน หากเว้นว่างจะใช้การสกัดแบบฮิวริสติก (แม่นยำน้อยกว่า)',
  'form.fieldsPh': 'เช่น เลขที่ใบกำกับ จำนวนเงิน วันที่',
  'form.start': 'เริ่มการสกัด',
  'form.warnSelectFile': 'กรุณาเลือกไฟล์ก่อน',
  'form.warnInputUrl': 'กรุณากรอก URL',
  'form.done': 'สกัดเสร็จสิ้น: extraction_id={id}',

  // 结果面板
  'result.empty': 'ผลลัพธ์จะแสดงที่นี่หลังจากส่งคำขอ',
  'result.colPage': 'หน้า',
  'result.colSource': 'แหล่งที่มา',
  'result.schemaExact': 'schema (แม่นยำ)',
  'result.colField': 'ชื่อฟิลด์',
  'result.clickEdit': 'คลิกเพื่อแก้ไข',
  'result.custom': 'กำหนดเอง',
  'result.colValue': 'ค่า',
  'result.pages': 'จำนวนหน้า',
  'result.items': 'จำนวนองค์ประกอบ',
  'result.fields': 'จำนวนฟิลด์',
  'result.duration': 'เวลาที่ใช้ (ms)',
  'result.tabFields': 'ฟิลด์ ({n})',
  'result.emptyFields': 'การสกัดนี้ไม่พบคู่ชื่อฟิลด์/ค่า',
  'result.tabMarkdown': 'Markdown',
  'result.emptyMd': 'ไม่มีผลลัพธ์ markdown',
  'result.tabElements': 'องค์ประกอบ ({n})',
  'result.emptyElements': 'ไม่มีองค์ประกอบ',
  'result.pageOf': 'หน้า {n}',
  'result.noText': '(ไม่มีข้อความ เช่น องค์ประกอบรูปภาพล้วน)',
  'result.tabPages': 'หน้า ({n})',
  'result.emptyPages': 'ไม่มีข้อมูลหน้า',
  'result.tabRaw': 'JSON ทั้งหมด',

  // 历史记录
  'history.colType': 'ประเภท',
  'history.colSource': 'แหล่งที่มา',
  'history.colPages': 'หน้า',
  'history.colItems': 'รายการ',
  'history.colFields': 'ฟิลด์',
  'history.colCreatedAt': 'วันที่สร้าง',
  'history.colAction': 'จัดการ',
  'history.view': 'ดู',
  'history.empty': 'ยังไม่มีรายการสกัด',
  'history.loadFail': 'โหลดประวัติไม่สำเร็จ: {msg}',
  'history.viewFail': 'โหลดรายการไม่สำเร็จ: {msg}',

  // 文件预览
  'preview.noFile': 'ไม่มีไฟล์สำหรับดูตัวอย่าง',
  'preview.cannot': 'ไม่สามารถดูตัวอย่างได้: {reason}',
  'preview.alt': 'ตัวอย่าง',
  'preview.zoom': 'คลิกเพื่อขยาย',
  'preview.pdfThumb': 'ภาพย่อหน้าแรกของ PDF',
  'preview.pdfAlt': 'ตัวอย่าง PDF',
  'preview.noThumb': '(ไม่มีภาพย่อ)',

  // API 兜底文案
  'api.requestFailed': 'คำขอล้มเหลว',
  'api.emptyResponse': 'การตอบกลับว่างเปล่า',
  'api.bizError': 'ข้อผิดพลาดจากระบบ (code={code})',
}

const dicts: Record<Locale, Dict> = { en, th }

/** 翻译：t('login.title') / t('result.pageOf', { n: 3 }) */
export function t(key: string, params?: Params): string {
  const dict = dicts[current]
  let s = dict[key] ?? en[key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.split(`{${k}}`).join(String(v))
    }
  }
  return s
}
