<script setup lang="ts">
import { CalendarDaysIcon, UsersIcon, ChartBarIcon, TagIcon, ClipboardDocumentListIcon } from '@heroicons/vue/24/outline'
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
    to: `/shop/${shopId.value}`,
    icon: ChartBarIcon,
    active: route.path === `/shop/${shopId.value}`,
  },
  {
    label: 'シフト',
    to: `/shop/${shopId.value}/shifts`,
    icon: CalendarDaysIcon,
    active: route.path === `/shop/${shopId.value}/shifts` || datePattern.test(route.path),
  },
  {
    label: 'スタッフ',
    to: `/shop/${shopId.value}/staff`,
    icon: UsersIcon,
    active: route.path.startsWith(`/shop/${shopId.value}/staff`),
  },
  {
    label: 'ポジション',
    to: `/shop/${shopId.value}/positions`,
    icon: TagIcon,
    active: route.path === `/shop/${shopId.value}/positions`,
  },
  {
    label: '勤怠記録',
    to: `/shop/${shopId.value}/attendance`,
    icon: ClipboardDocumentListIcon,
    active: route.path.startsWith(`/shop/${shopId.value}/attendance`),
  },
])
</script>

<template>
  <div class="flex min-h-screen">

    <!-- デスクトップ：左サイドバー -->
    <aside class="fixed inset-y-0 left-0 z-20 hidden w-56 flex-col border-r border-slate-200 bg-white lg:flex">
      <div class="border-b border-slate-100 px-5 py-5">
        <p class="truncate text-sm font-bold text-slate-800">{{ shopName }}</p>
      </div>
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
    </aside>

    <!-- メインコンテンツ -->
    <div class="min-h-screen w-full bg-slate-50 pb-16 lg:ml-56 lg:pb-0">
      <slot />
    </div>

    <!-- モバイル：下部タブバー -->
    <nav class="fixed bottom-0 left-0 right-0 z-20 flex border-t border-slate-200 bg-white lg:hidden">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors"
        :class="item.active ? 'text-brand' : 'text-slate-400'"
      >
        <component :is="item.icon" class="h-5 w-5" />
        <span>{{ item.label }}</span>
      </NuxtLink>
    </nav>

  </div>
</template>
