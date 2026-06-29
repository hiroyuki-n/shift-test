<script setup lang="ts">
import { HomeIcon, BuildingStorefrontIcon, UsersIcon, ClipboardDocumentListIcon } from '@heroicons/vue/24/outline'

const route = useRoute()

const navItems = [
  { label: 'ダッシュボード', to: '/admin',               icon: HomeIcon,                   },
  { label: '店舗',           to: '/admin/shops',         icon: BuildingStorefrontIcon,     },
  { label: 'スタッフ',       to: '/admin/staff',         icon: UsersIcon,                  },
  { label: '勤怠報告',       to: '/admin/attendance',    icon: ClipboardDocumentListIcon,  },
]
</script>

<template>
  <div class="flex min-h-screen">

    <!-- デスクトップ：左サイドバー -->
    <aside class="fixed inset-y-0 left-0 z-20 hidden w-56 flex-col border-r border-slate-200 bg-white lg:flex">
      <div class="border-b border-slate-100 px-5 py-5">
        <p class="truncate text-sm font-bold text-slate-800">本社管理</p>
      </div>
      <nav class="flex-1 space-y-1 px-3 py-4">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
          :class="route.path.startsWith(item.to) && (item.to !== '/admin' || route.path === '/admin')
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
        :class="route.path === item.to ? 'text-brand' : 'text-slate-400'"
      >
        <component :is="item.icon" class="h-5 w-5" />
        <span>{{ item.label }}</span>
      </NuxtLink>
    </nav>

  </div>
</template>
