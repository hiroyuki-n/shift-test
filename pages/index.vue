<script setup lang="ts">
/**
 * トップページ（ロール別エントリの案内）
 * 本番ではログイン後、ユーザーのRoleに応じて各ダッシュボードへ
 * リダイレクトする想定（middleware/auth.ts 等）。
 */
const entries = [
  { role: 'SUPER_ADMIN', label: '本社管理', to: '/admin', desc: '全店舗の管理・追加' },
  { role: 'SHOP_ADMIN', label: '店舗管理', to: '/admin', desc: '店舗一覧から対象店舗を選択' },
  { role: 'STAFF', label: 'マイシフト', to: '/staff', desc: '希望提出・確定シフト確認' },
]
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-slate-50 p-6">
    <div class="w-full max-w-3xl">
      <header class="mb-8 text-center">
        <h1 class="text-3xl font-bold text-slate-800">シフト管理システム</h1>
        <p class="mt-2 text-sm text-slate-500">ロールを選択してください（開発用エントリ）</p>
      </header>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <NuxtLink
          v-for="e in entries"
          :key="e.role"
          :to="e.to"
          class="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm transition hover:border-brand hover:shadow-md"
        >
          <p class="text-xs font-semibold uppercase tracking-wider text-brand">{{ e.role }}</p>
          <p class="mt-2 text-lg font-bold text-slate-800">{{ e.label }}</p>
          <p class="mt-1 text-xs text-slate-500">{{ e.desc }}</p>
        </NuxtLink>
      </div>
    </div>
  </main>
</template>
