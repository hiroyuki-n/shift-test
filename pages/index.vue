<script setup lang="ts">
interface Staff {
  id: number
  name: string
  employmentType: 'PART_TIME' | 'FULL_TIME' | null
  primaryShopId: number | null
}

interface Shop {
  id: number
  name: string
}

const { data: staffList } = await useFetch<Staff[]>('/api/staff', { default: () => [] })
const { data: shops } = await useFetch<Shop[]>('/api/shops', { default: () => [] })

const employmentLabel: Record<string, string> = {
  PART_TIME: 'アルバイト',
  FULL_TIME: '社員',
}

const staffByShop = computed(() => {
  return shops.value.map((shop) => ({
    shop,
    staff: staffList.value.filter((s) => s.primaryShopId === shop.id),
  }))
})
</script>

<template>
  <main class="min-h-screen bg-slate-50 p-6">
    <div class="mx-auto max-w-4xl">
      <header class="mb-8 text-center">
        <h1 class="text-3xl font-bold text-slate-800">シフト管理システム</h1>
        <p class="mt-2 text-sm text-slate-500">ログインするスタッフを選択してください</p>
      </header>

      <div class="mb-6 flex justify-end">
        <NuxtLink
          to="/admin"
          class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          管理画面へ
        </NuxtLink>
      </div>

      <div class="space-y-6">
        <section
          v-for="{ shop, staff } in staffByShop"
          :key="shop.id"
          class="rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          <div class="border-b border-slate-100 px-6 py-4">
            <h2 class="text-lg font-semibold text-slate-800">{{ shop.name }}</h2>
            <NuxtLink :to="`/shop/${shop.id}`" class="mt-0.5 text-xs text-brand hover:underline">
              店舗管理画面へ →
            </NuxtLink>
          </div>

          <ul class="divide-y divide-slate-100">
            <li
              v-for="s in staff"
              :key="s.id"
              class="flex items-center justify-between px-6 py-3"
            >
              <div class="flex items-center gap-3">
                <span class="text-sm font-medium text-slate-800">{{ s.name }}</span>
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="s.employmentType === 'FULL_TIME' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'"
                >
                  {{ s.employmentType ? employmentLabel[s.employmentType] : '—' }}
                </span>
              </div>
              <NuxtLink
                :to="`/login/${s.id}`"
                class="rounded-lg border border-brand px-3 py-1 text-xs font-semibold text-brand hover:bg-brand hover:text-white transition"
              >
                ログイン
              </NuxtLink>
            </li>
            <li v-if="staff.length === 0" class="px-6 py-4 text-sm text-slate-400">
              スタッフが登録されていません
            </li>
          </ul>
        </section>
      </div>
    </div>
  </main>
</template>
