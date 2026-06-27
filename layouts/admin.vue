<script setup lang="ts">
import {
  HomeIcon,
  BuildingStorefrontIcon,
  UsersIcon,
  ArrowLeftIcon,
} from '@heroicons/vue/24/outline'

const route = useRoute()

const navItems = [
  { label: 'ダッシュボード', to: '/admin',        icon: HomeIcon,                 },
  { label: '店舗一覧',       to: '/admin/shops',  icon: BuildingStorefrontIcon,   },
  { label: 'スタッフ一覧',   to: '/admin/staff',  icon: UsersIcon,                },
]
</script>

<template>
  <div class="flex min-h-screen">

    <aside class="fixed inset-y-0 left-0 z-20 flex w-56 flex-col border-r border-slate-200 bg-white">
      <div class="border-b border-slate-100 px-5 py-5">
        <p class="truncate text-sm font-bold text-slate-800">本社管理</p>
      </div>

      <nav class="flex-1 space-y-1 px-3 py-4">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
          :class="route.path === item.to
            ? 'bg-brand/10 text-brand'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'"
        >
          <component :is="item.icon" class="h-4 w-4 shrink-0" />
          {{ item.label }}
        </NuxtLink>
      </nav>

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

    <div class="ml-56 min-h-screen flex-1 bg-slate-50">
      <slot />
    </div>

  </div>
</template>
