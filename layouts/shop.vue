<script setup lang="ts">
import { CalendarDaysIcon, UsersIcon, ArrowLeftIcon, ChartBarIcon } from '@heroicons/vue/24/outline'
const route  = useRoute()
const shopId = computed(() => route.params.shopId as string)

const { data: shopData } = await useFetch(
  () => `/api/shops/${shopId.value}`,
  { default: () => ({ shop: { name: '' } }) },
)

const shopName = computed(() => (shopData.value as { shop?: { name?: string } } | null)?.shop?.name ?? '')

const datePattern = /^\/shop\/\d+\/\d{4}-\d{2}-\d{2}$/

const navItems = computed(() => [
  {
    label: 'ダッシュボード',
    to: `/shop/${shopId.value}/dashboard`,
    icon: ChartBarIcon,
    active: route.path === `/shop/${shopId.value}/dashboard`,
  },
  {
    label: 'シフトカレンダー',
    to: `/shop/${shopId.value}`,
    icon: CalendarDaysIcon,
    active: route.path === `/shop/${shopId.value}` || datePattern.test(route.path),
  },
  {
    label: 'スタッフ一覧',
    to: `/shop/${shopId.value}/staff`,
    icon: UsersIcon,
    active: route.path.startsWith(`/shop/${shopId.value}/staff`),
  },
])
</script>

<template>
  <div class="flex min-h-screen">

    <!-- サイドバー -->
    <aside class="fixed inset-y-0 left-0 z-20 flex w-56 flex-col border-r border-slate-200 bg-white">

      <!-- 店舗名 -->
      <div class="border-b border-slate-100 px-5 py-5">
        <p class="truncate text-sm font-bold text-slate-800">{{ shopName }}</p>
      </div>

      <!-- ナビゲーション -->
      <nav class="flex-1 space-y-1 px-3 py-4">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
          :class="item.active
            ? 'bg-brand/10 text-brand'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'"
        >
          <component :is="item.icon" class="h-4 w-4 shrink-0" />
          {{ item.label }}
        </NuxtLink>
      </nav>

      <!-- 下部リンク -->
      <div class="border-t border-slate-100 px-3 py-4">
        <button
          class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          @click="navigateTo('/')"
        >
          <ArrowLeftIcon class="h-4 w-4 shrink-0" />
          トップへ戻る
        </button>
      </div>

    </aside>

    <!-- メインコンテンツ -->
    <div class="ml-56 min-h-screen flex-1 bg-slate-50">
      <slot />
    </div>

  </div>
</template>
