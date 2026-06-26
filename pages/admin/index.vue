<script setup lang="ts">
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
  address: string | null
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
const newShop = reactive({ name: '', address: '' })
const submitting = ref(false)
const formError = ref('')

async function addShop() {
  if (!newShop.name.trim()) return
  submitting.value = true
  formError.value = ''
  try {
    await $fetch('/api/shops', {
      method: 'POST',
      body: { name: newShop.name.trim(), address: newShop.address.trim() },
    })
    newShop.name = ''
    newShop.address = ''
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
  <main class="min-h-screen bg-slate-50 p-6">
    <div class="mx-auto max-w-6xl">
      <!-- ヘッダー -->
      <header class="mb-8 flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-brand">SUPER ADMIN</p>
          <h1 class="text-2xl font-bold text-slate-800">本社管理ダッシュボード</h1>
        </div>
        <button
          class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
          @click="showForm = !showForm"
        >
          + 店舗を追加
        </button>
      </header>

      <!-- KPIカード -->
      <section class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <article class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-sm text-slate-500">登録店舗数</p>
          <p class="mt-1 text-3xl font-bold text-slate-800">{{ dashboard.shopCount }}</p>
        </article>
        <article class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-sm text-slate-500">総スタッフ数</p>
          <p class="mt-1 text-3xl font-bold text-slate-800">{{ dashboard.staffTotal }}</p>
        </article>
        <article class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-sm text-slate-500">承認待ちシフト</p>
          <p class="mt-1 text-3xl font-bold text-amber-500">{{ dashboard.pendingRequests }}</p>
        </article>
      </section>

      <!-- 店舗追加フォーム -->
      <section v-if="showForm" class="mb-8 rounded-xl border border-brand/30 bg-white p-6 shadow-sm">
        <h2 class="mb-4 text-lg font-semibold text-slate-800">店舗を新規追加</h2>
        <form class="grid grid-cols-1 gap-4 sm:grid-cols-2" @submit.prevent="addShop">
          <label class="block">
            <span class="mb-1 block text-sm font-medium text-slate-600">店舗名</span>
            <input
              v-model="newShop.name"
              type="text"
              required
              placeholder="例: 池袋北口店"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
          <label class="block">
            <span class="mb-1 block text-sm font-medium text-slate-600">住所</span>
            <input
              v-model="newShop.address"
              type="text"
              placeholder="例: 東京都豊島区西池袋1-1-1"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
          <p v-if="formError" class="text-sm text-rose-600 sm:col-span-2">{{ formError }}</p>
          <div class="sm:col-span-2">
            <button
              type="submit"
              :disabled="submitting"
              class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {{ submitting ? '登録中…' : '登録する' }}
            </button>
          </div>
        </form>
      </section>

      <!-- 店舗一覧 -->
      <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
        <h2 class="border-b border-slate-100 px-6 py-4 text-lg font-semibold text-slate-800">店舗一覧</h2>

        <p v-if="pending" class="px-6 py-8 text-center text-sm text-slate-400">読み込み中…</p>
        <p v-else-if="error" class="px-6 py-8 text-center text-sm text-rose-600">
          データの取得に失敗しました（{{ error.statusMessage || error.message }}）
        </p>
        <p v-else-if="shops.length === 0" class="px-6 py-8 text-center text-sm text-slate-400">
          店舗がまだ登録されていません
        </p>

        <table v-else class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th class="px-6 py-3">店舗名</th>
              <th class="px-6 py-3">住所</th>
              <th class="px-6 py-3 text-right">スタッフ数</th>
              <th class="px-6 py-3">作成日</th>
              <th class="px-6 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="shop in shops" :key="shop.id" class="hover:bg-slate-50">
              <td class="px-6 py-4 font-medium text-slate-800">{{ shop.name }}</td>
              <td class="px-6 py-4 text-slate-600">{{ shop.address ?? '—' }}</td>
              <td class="px-6 py-4 text-right text-slate-600">{{ shop.staffCount }}</td>
              <td class="px-6 py-4 text-slate-500">{{ formatDate(shop.createdAt) }}</td>
              <td class="px-6 py-4 text-right">
                <NuxtLink :to="`/shop/${shop.id}`" class="font-medium text-brand hover:underline">管理画面へ</NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </main>
</template>
