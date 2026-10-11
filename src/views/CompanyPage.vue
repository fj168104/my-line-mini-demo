<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  ApiError,
  bindCompany,
  createCompany,
  filePagePreviewUrl,
  getMyCompanies,
  unbindCompany,
  updateCompany,
  type MyCompany,
} from '../api';
import { messageText } from '../i18n';
import { useT } from '../i18nVue';
import { currentWorkspace, goTab, refreshSession, workspaces } from '../store';
import { uploadFile } from '../upload';
import PageHeader from '../components/PageHeader.vue';

const { t } = useT();

const loading = ref(true);
const mine = ref<MyCompany[]>([]);
const errorMsg = ref('');

// 绑定
const bindId = ref('');
const bindBusy = ref(false);
const bindMsg = ref('');

// 表单（添加 / 编辑）
const showForm = ref(false);
const editing = ref<MyCompany | null>(null);
const legalName = ref('');
const regNo = ref('');
const contactPhone = ref('');
const certFileId = ref<string | null>(null);
const certUploading = ref(false);
const submitting = ref(false);
const fieldErrors = ref<Record<string, string>>({});

const certInput = ref<HTMLInputElement | null>(null);

async function load() {
  loading.value = true;
  errorMsg.value = '';
  try {
    const data = await getMyCompanies();
    mine.value = data.items;
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? messageText(e.messageKey) : t('common.unknownError');
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function statusClass(s: string): string {
  return s.toLowerCase();
}

// ---------- 绑定 ----------

async function doBind() {
  if (bindBusy.value) return;
  const raw = bindId.value.trim();
  if (!/^ent-[a-z0-9-]+$/i.test(raw)) {
    errorMsg.value = t('company.bindErrorId');
    return;
  }
  bindBusy.value = true;
  errorMsg.value = '';
  bindMsg.value = '';
  try {
    const r = await bindCompany(raw);
    bindMsg.value = t('company.bindSuccess', { name: r.enterprise.legal_name });
    bindId.value = '';
    await load();
    await refreshSession();
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? messageText(e.messageKey) : t('common.unknownError');
  } finally {
    bindBusy.value = false;
  }
}

// ---------- 解绑 ----------

async function doUnbind(c: MyCompany) {
  if (!window.confirm(t('company.unbindConfirm', { name: c.legal_name }))) return;
  errorMsg.value = '';
  try {
    await unbindCompany(c.id);
    await load();
    await refreshSession();
    // 若当前正以该公司身份工作，切回个人空间
    const ws = currentWorkspace.value;
    if (ws && ws.workspace_type === 'ENTERPRISE' && ws.enterprise_id === c.id) {
      currentWorkspace.value = workspaces.value.find((w) => w.workspace_type === 'PERSONAL') ?? null;
    }
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? messageText(e.messageKey) : t('common.unknownError');
  }
}

// ---------- 添加 / 编辑 ----------

function resetForm() {
  editing.value = null;
  legalName.value = '';
  regNo.value = '';
  contactPhone.value = '';
  certFileId.value = null;
  fieldErrors.value = {};
}

function startAdd() {
  resetForm();
  showForm.value = true;
}

function startEdit(c: MyCompany) {
  editing.value = c;
  legalName.value = c.legal_name;
  regNo.value = c.registration_no;
  contactPhone.value = c.contact_phone;
  certFileId.value = c.cert_file_id;
  fieldErrors.value = {};
  showForm.value = true;
}

function cancelForm() {
  showForm.value = false;
  resetForm();
}

function pickCert() {
  certInput.value?.click();
}

async function onCertPicked(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  certUploading.value = true;
  errorMsg.value = '';
  try {
    const ready = await uploadFile(file, undefined, 'APPLICATION_MATERIAL');
    certFileId.value = ready.id;
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? messageText(e.messageKey) : t('common.unknownError');
  } finally {
    certUploading.value = false;
    input.value = '';
  }
}

function validate(): boolean {
  const errs: Record<string, string> = {};
  if (!legalName.value.trim() || legalName.value.trim().length > 255) {
    errs.legal_name = t('company.error.required');
  }
  if (!regNo.value.trim() || regNo.value.trim().length > 64) {
    errs.registration_no = t('company.error.required');
  }
  if (contactPhone.value.trim().length > 32) {
    errs.contact_phone = t('company.error.phone');
  }
  fieldErrors.value = errs;
  return Object.keys(errs).length === 0;
}

async function submit() {
  if (submitting.value || !validate()) return;
  submitting.value = true;
  errorMsg.value = '';
  const payload = {
    legal_name: legalName.value.trim(),
    registration_no: regNo.value.trim(),
    contact_phone: contactPhone.value.trim(),
    cert_file_id: certFileId.value,
  };
  try {
    if (editing.value) {
      await updateCompany(editing.value.id, payload);
    } else {
      await createCompany(payload);
    }
    showForm.value = false;
    resetForm();
    await load();
    await refreshSession();
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? messageText(e.messageKey) : t('common.unknownError');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="company-page">
    <PageHeader :title="t('company.title')" @back="goTab('my')" />

    <div class="content">
      <p v-if="errorMsg" class="error-banner">{{ errorMsg }}</p>
      <p v-if="loading" class="hint">{{ t('common.loading') }}</p>

      <template v-else>
        <!-- 按编号绑定 -->
        <section class="card">
          <div class="section-title">{{ t('company.bindTitle') }}</div>
          <p class="hint">{{ t('company.bindHint') }}</p>
          <div class="bind-row">
            <input
              v-model="bindId"
              type="text"
              :placeholder="t('company.bindPlaceholder')"
              @keyup.enter="doBind"
            />
            <button class="bind-btn" :disabled="bindBusy" @click="doBind">
              {{ t('company.bind') }}
            </button>
          </div>
          <p v-if="bindMsg" class="success-line">{{ bindMsg }}</p>
        </section>

        <!-- 我的公司 -->
        <section class="card">
          <div class="section-head">
            <div class="section-title">{{ t('company.myCompanies') }}</div>
            <button class="link-btn" @click="startAdd">{{ t('company.add') }}</button>
          </div>
          <p v-if="mine.length === 0" class="hint">{{ t('company.empty') }}</p>
          <div v-for="c in mine" :key="c.id" class="company-item">
            <div class="company-line">
              <span class="company-id">#{{ c.id }}</span>
              <span class="company-name">{{ c.legal_name }}</span>
              <span class="status-badge" :class="statusClass(c.status)">
                {{ t(`company.status.${c.status}`) }}
              </span>
            </div>
            <div class="company-meta">
              <span>{{ c.registration_no }}</span>
              <span class="company-code">{{ c.code }}</span>
              <em v-if="c.my_role !== 'MEMBER'">{{ c.my_role }}</em>
            </div>
            <div v-if="c.status === 'VERIFIED'" class="bonus-line">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1F9E6B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              {{ t('company.bonusHint') }}
            </div>
            <img
              v-if="c.cert_file_id && c.my_role === 'OWNER'"
              class="cert-thumb"
              :src="filePagePreviewUrl(c.cert_file_id, 1)"
              alt="cert"
            />
            <div class="company-actions">
              <button v-if="c.my_role === 'OWNER'" class="mini-btn" @click="startEdit(c)">
                {{ t('company.edit') }}
              </button>
              <button class="mini-btn danger" @click="doUnbind(c)">
                {{ t('company.unbind') }}
              </button>
            </div>
          </div>
          <p class="hint">{{ t('company.reviewHint') }}</p>
        </section>

        <!-- 添加 / 编辑表单 -->
        <section v-if="showForm" class="card">
          <div class="section-title">
            {{ editing ? t('company.editTitle') : t('company.addTitle') }}
          </div>
          <p v-if="editing && editing.status === 'VERIFIED'" class="hint warn">
            {{ t('company.editResets') }}
          </p>
          <label class="field">
            <span>{{ t('company.legalName') }}</span>
            <input v-model="legalName" type="text" :class="{ invalid: fieldErrors.legal_name }" />
            <em v-if="fieldErrors.legal_name">{{ fieldErrors.legal_name }}</em>
          </label>
          <label class="field">
            <span>{{ t('company.regNo') }}</span>
            <input v-model="regNo" type="text" :class="{ invalid: fieldErrors.registration_no }" />
            <em v-if="fieldErrors.registration_no">{{ fieldErrors.registration_no }}</em>
          </label>
          <label class="field">
            <span>{{ t('company.contactPhone') }}</span>
            <input v-model="contactPhone" type="text" :class="{ invalid: fieldErrors.contact_phone }" />
            <em v-if="fieldErrors.contact_phone">{{ fieldErrors.contact_phone }}</em>
          </label>
          <div class="field">
            <span>{{ t('company.certPhoto') }}</span>
            <div class="cert-row">
              <button class="mini-btn" :disabled="certUploading" @click="pickCert">
                {{ certUploading ? t('company.certUploading') : certFileId ? t('company.certChange') : t('company.certPick') }}
              </button>
              <img v-if="certFileId" class="cert-thumb" :src="filePagePreviewUrl(certFileId, 1)" alt="cert" />
            </div>
            <p class="hint">{{ t('company.certHint') }}</p>
          </div>
          <div class="form-actions">
            <button class="ghost-btn" @click="cancelForm">{{ t('common.cancel') }}</button>
            <button class="primary-cta" :disabled="submitting" @click="submit">
              {{ submitting ? t('company.submitting') : editing ? t('company.save') : t('company.submit') }}
            </button>
          </div>
        </section>
      </template>
    </div>

    <input
      ref="certInput"
      type="file"
      accept="image/jpeg,image/png,application/pdf"
      style="display: none"
      @change="onCertPicked"
    />
  </div>
</template>

<style scoped>
.company-page {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.content {
  padding: 0 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hint {
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

.hint.warn {
  color: var(--processing);
}

.error-banner {
  background: #fdecec;
  color: var(--danger);
  font-size: 11px;
  border-radius: 10px;
  padding: 10px 12px;
  margin: 0;
}

.success-line {
  font-size: 11px;
  color: var(--success);
  margin: 0;
}

.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 12px;
  font-weight: 700;
}

.link-btn {
  font-size: 11px;
  font-weight: 700;
  color: var(--primary);
}

.bind-row {
  display: flex;
  gap: 8px;
}

.bind-row input {
  flex: 1;
  height: 40px;
  border-radius: 10px;
  border: 1px solid var(--border);
  padding: 0 12px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  color: var(--text);
}

.bind-row input:focus {
  border-color: var(--primary);
}

.bind-btn {
  height: 40px;
  padding: 0 18px;
  border-radius: 10px;
  background: var(--primary);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.bind-btn:disabled {
  opacity: 0.6;
}

.company-item {
  border-top: 1px solid var(--border);
  padding-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.company-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.company-id {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-secondary);
}

.company-name {
  font-size: 12px;
  font-weight: 700;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--processing-bg);
  color: var(--processing);
  flex-shrink: 0;
}

.status-badge.verified {
  background: var(--success-bg);
  color: var(--success);
}

.status-badge.disabled,
.status-badge.suspended {
  background: #fdecec;
  color: var(--danger);
}

.company-meta {
  display: flex;
  gap: 8px;
  font-size: 10px;
  color: var(--text-secondary);
}

.company-code {
  font-family: monospace;
}

.company-meta em {
  font-style: normal;
  font-weight: 600;
}

.bonus-line {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 9.5px;
  color: var(--icon);
}

.bonus-line svg {
  flex-shrink: 0;
}

.cert-thumb {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--border);
}

.company-actions {
  display: flex;
  gap: 8px;
}

.mini-btn {
  height: 30px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text);
  font-size: 11px;
  font-weight: 700;
}

.mini-btn.danger {
  color: var(--danger);
  border-color: #f5c6c8;
}

.mini-btn:disabled {
  opacity: 0.6;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field span {
  font-size: 11px;
  font-weight: 600;
}

.field input {
  height: 40px;
  border-radius: 10px;
  border: 1px solid var(--border);
  padding: 0 12px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  background: var(--card);
  color: var(--text);
}

.field input:focus {
  border-color: var(--primary);
}

.field input.invalid {
  border-color: var(--danger);
}

.field em {
  font-style: normal;
  font-size: 10px;
  color: var(--danger);
}

.cert-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.form-actions {
  display: flex;
  gap: 8px;
}

.ghost-btn {
  height: 44px;
  padding: 0 18px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text);
  font-size: 13px;
  font-weight: 700;
}

.primary-cta {
  flex: 1;
  height: 44px;
  border-radius: 12px;
  background: var(--primary);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.primary-cta:disabled {
  opacity: 0.6;
}
</style>
