<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ApiError, fetchPlans, fetchQuota, type Plan, type QuotaWorkspace } from '../api';
import { messageText } from '../i18n';
import { useT } from '../i18nVue';
import { currentWorkspace, navigate } from '../store';
import alibabaLogo from '../assets/alibaba-logo.png';

const { t: tt } = useT();

const plans = ref<Plan[]>([]);
const myQuota = ref<QuotaWorkspace | null>(null);
const loading = ref(true);
const errorMsg = ref('');

onMounted(async () => {
  try {
    const [p, q] = await Promise.all([fetchPlans(), fetchQuota()]);
    plans.value = p.items;
    const ws = currentWorkspace.value;
    myQuota.value =
      q.workspaces.find(
        (w) => w.workspace_type === (ws?.workspace_type ?? 'PERSONAL') &&
          w.enterprise_id === (ws?.enterprise_id ?? null),
      ) ?? q.workspaces[0] ?? null;
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? messageText(e.messageKey) : tt('common.unknownError');
  } finally {
    loading.value = false;
  }
});

const quotaPct = computed(() => {
  const q = myQuota.value;
  if (!q || q.free_tasks.total <= 0) return 0;
  return Math.min(100, Math.round((q.free_tasks.remaining / q.free_tasks.total) * 100));
});

function workspaceLabel(): string {
  const ws = currentWorkspace.value;
  if (!ws || ws.workspace_type === 'PERSONAL') return tt('plans.personalWorkspace');
  return ws.enterprise_name || tt('plans.enterpriseWorkspace');
}

function seatsLabel(p: Plan): string {
  return p.seats === 1 ? tt('plans.seat') : tt('plans.seats', { n: p.seats });
}

function priceLabel(p: Plan): string {
  if (p.price.monthly_thb == null && p.price.yearly_thb == null) return 'Contact us';
  return p.price.display;
}

function priceSub(p: Plan): string {
  if (p.price.monthly_thb == null && p.price.yearly_thb == null) return '';
  if (p.price.monthly_thb != null && p.price.yearly_thb != null) {
    return `THB ${p.price.yearly_thb.toLocaleString('en-US')} / yr`;
  }
  return '';
}
</script>

<template>
  <div class="plans">
    <header class="plans-header">
      <button class="back" @click="navigate('my')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <div class="title">{{ tt('plans.title') }}</div>
      <div class="spacer" />
    </header>

    <div class="body">
      <div v-if="loading" class="status">{{ tt('common.loading') }}</div>
      <div v-else-if="errorMsg" class="status error">{{ errorMsg }}</div>

      <template v-else>
        <!-- 当前套餐：渐变卡片 -->
        <div v-if="myQuota" class="current-card">
          <div class="current-top">
            <div class="current-name">
              {{ myQuota.plan.name }} · <span class="current-free">{{ tt('plans.currentFree') }}</span>
            </div>
            <span class="current-badge">{{ tt('home.freeBadge') }}</span>
          </div>
          <div class="current-track">
            <div class="current-fill" :style="{ width: quotaPct + '%' }" />
          </div>
          <div class="current-meta">
            <span>{{ tt('home.quotaLeft', { plan: '', left: myQuota.free_tasks.remaining, total: myQuota.free_tasks.total }).trim() }}</span>
            <span class="current-ws">{{ workspaceLabel() }}</span>
          </div>
        </div>

        <!-- 套餐目录 -->
        <div class="packages-label">{{ tt('plans.packages') }}</div>
        <div class="plan-grid">
          <div
            v-for="p in plans"
            :key="p.code"
            class="plan-card"
            :class="{ default: p.is_default, dark: p.code === 'ADVANCE' }"
          >
            <div v-if="p.is_default" class="plan-flag">{{ tt('plans.current') }}</div>
            <div class="plan-name">{{ p.name }}</div>
            <div class="plan-price">{{ priceLabel(p) }}</div>
            <div v-if="priceSub(p)" class="plan-price-sub">{{ priceSub(p) }}</div>
            <ul class="plan-features">
              <li>{{ tt('plans.pagesPerMonth', { n: p.quota_pages_per_month.toLocaleString('en-US') }) }}</li>
              <li>{{ seatsLabel(p) }}</li>
              <li v-for="f in p.features" :key="f">{{ f }}</li>
            </ul>
            <button
              class="plan-cta"
              :class="{ primary: !p.is_default && p.price.monthly_thb != null, dark: p.code === 'ADVANCE' }"
              disabled
              :title="tt('plans.offlineTitle')"
            >
              {{ p.is_default ? tt('plans.current') : p.price.monthly_thb != null ? tt('plans.contactToBuy') : tt('plans.getQuote') }}
            </button>
          </div>
        </div>

        <!-- 线下支付说明 -->
        <div class="offline-notice">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D98F1F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div>
            <div class="offline-title">{{ tt('plans.offlineTitle') }}</div>
            <div class="offline-body">{{ tt('plans.offlineBody') }}</div>
          </div>
        </div>

        <div class="footnote">{{ tt('plans.footnote') }}</div>

        <div class="footer">
          <span class="footer-brand">saiflow</span>
          <span class="footer-by">by</span>
          <img class="footer-logo" :src="alibabaLogo" alt="Alibaba" />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.plans {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.plans-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 20px 12px;
}

.back {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--icon);
}

.title {
  flex: 1;
  text-align: center;
  font-size: 15px;
  font-weight: 700;
}

.spacer {
  width: 34px;
}

.body {
  padding: 4px 16px 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.status {
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
  padding: 24px 0;
}

.status.error {
  color: var(--danger);
}

/* ---- 当前套餐渐变卡 ---- */
.current-card {
  border-radius: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #5a76ff 0%, #4a66f7 55%, #3a55e0 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.current-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.current-name {
  font-size: 17px;
  font-weight: 700;
}

.current-free {
  font-size: 13px;
  font-weight: 600;
  opacity: 0.9;
}

.current-badge {
  background: rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.4px;
  white-space: nowrap;
}

.current-track {
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.3);
  overflow: hidden;
}

.current-fill {
  height: 100%;
  border-radius: 3px;
  background: #fff;
}

.current-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 10px;
  opacity: 0.92;
}

/* ---- 套餐网格 ---- */
.packages-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.plan-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.plan-card {
  position: relative;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.plan-card.default {
  border-color: var(--primary);
}

.plan-card.dark {
  background: #1a1f29;
  border-color: #1a1f29;
  color: #fff;
}

.plan-flag {
  position: absolute;
  top: -8px;
  right: 10px;
  background: var(--primary);
  color: #fff;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.4px;
  border-radius: 999px;
  padding: 3px 8px;
}

.plan-name {
  font-size: 13px;
  font-weight: 700;
}

.plan-price {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}

.plan-card.dark .plan-price {
  color: #fff;
}

.plan-price-sub {
  font-size: 9px;
  color: var(--text-secondary);
}

.plan-card.dark .plan-price-sub {
  color: #99a1b0;
}

.plan-features {
  margin: 2px 0 4px;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 9.5px;
  color: var(--icon);
  flex: 1;
}

.plan-card.dark .plan-features {
  color: #99a1b0;
}

.plan-cta {
  border-radius: 10px;
  padding: 8px 0;
  font-size: 11px;
  font-weight: 700;
  background: var(--track);
  color: var(--icon);
}

.plan-cta.primary {
  background: var(--primary);
  color: #fff;
}

.plan-card.dark .plan-cta,
.plan-cta.dark {
  background: #ffffff;
  color: #1a1f29;
}

/* ---- 线下支付说明 ---- */
.offline-notice {
  display: flex;
  gap: 10px;
  background: var(--processing-bg);
  border-radius: 12px;
  padding: 12px 14px;
}

.offline-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--processing);
}

.offline-body {
  font-size: 10px;
  color: var(--processing);
  margin-top: 2px;
  line-height: 1.5;
}

.footnote {
  font-size: 9.5px;
  color: var(--text-secondary);
  text-align: center;
}

.footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding-top: 4px;
}

.footer-brand {
  font-size: 11px;
  font-weight: 700;
  color: var(--primary);
}

.footer-by {
  font-size: 10px;
  color: var(--text-secondary);
}

.footer-logo {
  height: 14px;
  display: block;
}
</style>
