<script setup lang="ts">
import { BuildingStorefrontIcon, UserGroupIcon, ClockIcon, PlusIcon, ArrowRightIcon } from '@heroicons/vue/24/outline'

definePageMeta({ layout: 'admin' })

/**
 * 管理ページ（本社用ダッシュボード）
 * 対象Role: SUPER_ADMIN
 * - 全店舗一覧の表示（Supabase）
 * - 店舗の新規追加（Supabase へ保存）
 * - システム全体のダッシュボード（KPI）
 *
 * ※ 認証・権限チェックは middleware（例: middleware/role.ts）で
 *    SUPER_ADMIN のみアクセス可能にする想定。
 */

interface Shop {
  id: string
  name: string
  createdAt: string
  staffCount: number
}

const { data: shops, pending, error, refresh } = await useFetch<Shop[]>('/api/shops', {
  default: () => [],
})
const { data: stats } = await useFetch<{ pendingRequests: number }>('/api/stats', {
  default: () => ({ pendingRequests: 0 }),
})

const dashboard = computed(() => ({
  shopCount: shops.value.length,
  staffTotal: shops.value.reduce((sum, s) => sum + s.staffCount, 0),
  pendingRequests: stats.value?.pendingRequests ?? 0,
}))

// --- 店舗新規追加フォーム ---
const showForm = ref(false)
const newShop = reactive({ name: '' })
const submitting = ref(false)
const formError = ref('')

async function addShop() {
  if (!newShop.name.trim()) return
  submitting.value = true
  formError.value = ''
  try {
    await $fetch('/api/shops', {
      method: 'POST',
      body: { name: newShop.name.trim() },
    })
    newShop.name = ''
    showForm.value = false
    await refresh()
  } catch (e: unknown) {
    formError.value = e instanceof Error ? e.message : '店舗の追加に失敗しました'
  } finally {
    submitting.value = false
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('ja-JP')
}
</script>

<template>
  <div class="mx-auto max-w-5xl p-8">
      <!-- ヘッダー -->
      <header class="mb-8">
        <h1 class="text-2xl font-bold text-slate-800">本社管理ダッシュボード</h1>
      </header>

      <!-- KPIカード -->
      <section class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <article class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex items-center gap-2 text-slate-500">
            <BuildingStorefrontIcon class="h-4 w-4" />
            <p class="text-sm">登録店舗数</p>
          </div>
          <p class="mt-1 text-3xl font-bold text-slate-800">{{ dashboard.shopCount }}</p>
        </article>
        <article class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex items-center gap-2 text-slate-500">
            <UserGroupIcon class="h-4 w-4" />
            <p class="text-sm">総スタッフ数</p>
          </div>
          <p class="mt-1 text-3xl font-bold text-slate-800">{{ dashboard.staffTotal }}</p>
        </article>
        <article class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex items-center gap-2 text-slate-500">
            <ClockIcon class="h-4 w-4" />
            <p class="text-sm">承認待ちシフト</p>
          </div>
          <p class="mt-1 text-3xl font-bold text-amber-500">{{ dashboard.pendingRequests }}</p>
        </article>
      </section>

  </div>
</template>
