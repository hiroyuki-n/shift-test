<script setup lang="ts">
/**
 * 管理ページ（本社用ダッシュボード）
 * 対象Role: SUPER_ADMIN
 * - 全店舗一覧の表示
 * - 店舗の新規追加
 * - システム全体のダッシュボード（KPI雛形）
 *
 * ※ 認証・権限チェックは middleware（例: middleware/role.ts）で
 *    SUPER_ADMIN のみアクセス可能にする想定。
 */

interface Shop {
  id: string
  name: string
  address: string
  staffCount: number
  createdAt: string
}

// --- モックデータ（本番では useFetch('/api/shops') 等に置き換え） ---
const shops = ref<Shop[]>([
  { id: 's-001', name: '渋谷本店', address: '東京都渋谷区道玄坂1-2-3', staffCount: 24, createdAt: '2024-04-01' },
  { id: 's-002', name: '新宿東口店', address: '東京都新宿区新宿3-1-1', staffCount: 31, createdAt: '2024-05-12' },
  { id: 's-003', name: '横浜西口店', address: '神奈川県横浜市西区南幸2-5-7', staffCount: 18, createdAt: '2024-07-20' },
])

// --- ダッシュボードKPI（モック集計） ---
const stats = computed(() => ({
  shopCount: shops.value.length,
  staffTotal: shops.value.reduce((sum, s) => sum + s.staffCount, 0),
  pendingRequests: 42, // 承認待ち希望シフト件数（モック）
}))

// --- 店舗新規追加フォーム ---
const showForm = ref(false)
const newShop = reactive({ name: '', address: '' })

function addShop() {
  if (!newShop.name.trim()) return
  shops.value.push({
    id: `s-${String(shops.value.length + 1).padStart(3, '0')}`,
    name: newShop.name.trim(),
    address: newShop.address.trim(),
    staffCount: 0,
    createdAt: new Date().toISOString().slice(0, 10),
  })
  newShop.name = ''
  newShop.address = ''
  showForm.value = false
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
          <p class="mt-1 text-3xl font-bold text-slate-800">{{ stats.shopCount }}</p>
        </article>
        <article class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-sm text-slate-500">総スタッフ数</p>
          <p class="mt-1 text-3xl font-bold text-slate-800">{{ stats.staffTotal }}</p>
        </article>
        <article class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-sm text-slate-500">承認待ちシフト</p>
          <p class="mt-1 text-3xl font-bold text-amber-500">{{ stats.pendingRequests }}</p>
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
          <div class="sm:col-span-2">
            <button type="submit" class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
              登録する
            </button>
          </div>
        </form>
      </section>

      <!-- 店舗一覧 -->
      <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
        <h2 class="border-b border-slate-100 px-6 py-4 text-lg font-semibold text-slate-800">店舗一覧</h2>
        <table class="w-full text-left text-sm">
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
              <td class="px-6 py-4 text-slate-600">{{ shop.address }}</td>
              <td class="px-6 py-4 text-right text-slate-600">{{ shop.staffCount }}</td>
              <td class="px-6 py-4 text-slate-500">{{ shop.createdAt }}</td>
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
