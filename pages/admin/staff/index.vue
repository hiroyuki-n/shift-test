<script setup lang="ts">
import { ArrowRightIcon } from '@heroicons/vue/24/outline'

definePageMeta({ layout: 'admin' })

interface Staff {
  id: number
  name: string
  employmentType: 'PART_TIME' | 'FULL_TIME' | null
  primaryShopId: number | null
  createdAt: string
  full_time_settings: Record<string, never> | null
  part_time_settings: { hourlywage: number | null } | null
}

interface Shop { id: number; name: string }

const { data: staffList, pending } = await useFetch<Staff[]>('/api/staff', { default: () => [] })
const { data: shops }              = await useFetch<Shop[]>('/api/shops', { default: () => [] })

const shopMap = computed(() => {
  const m = new Map<number, string>()
  shops.value.forEach(s => m.set(s.id, s.name))
  return m
})

const sortedStaff = computed(() =>
  [...staffList.value].sort((a, b) => a.id - b.id),
)

const employmentLabel: Record<string, string> = {
  PART_TIME: 'アルバイト',
  FULL_TIME: '社員',
}
</script>

<template>
  <div class="mx-auto max-w-4xl p-6">

    <header class="mb-6">
      <h1 class="text-xl font-bold text-slate-800">スタッフ一覧</h1>
      <p class="mt-0.5 text-sm text-slate-500">{{ sortedStaff.length }} 名</p>
    </header>

    <p v-if="pending" class="py-10 text-center text-sm text-slate-400">読み込み中…</p>

    <p v-else-if="sortedStaff.length === 0" class="rounded-xl border border-slate-200 bg-white py-10 text-center text-sm text-slate-400 shadow-sm">
      スタッフが登録されていません
    </p>

    <ul v-else class="space-y-2">
      <li v-for="staff in sortedStaff" :key="staff.id">
        <NuxtLink
          :to="`/admin/staff/${staff.id}`"
          class="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm transition hover:border-brand hover:shadow-md"
        >
          <div>
            <div class="flex items-center gap-2">
              <p class="font-medium text-slate-800">{{ staff.name }}</p>
              <span class="font-mono text-xs text-slate-400">ID: {{ staff.id }}</span>
            </div>
            <p class="mt-0.5 text-xs text-slate-400">
              <span
                v-if="staff.employmentType"
                class="mr-1.5 rounded-full px-1.5 py-0.5 font-medium"
                :class="staff.employmentType === 'FULL_TIME' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'"
              >{{ employmentLabel[staff.employmentType] }}</span>
              {{ staff.primaryShopId ? shopMap.get(staff.primaryShopId) ?? '—' : '—' }}
              <template v-if="staff.part_time_settings?.hourlywage != null">
                ・ ¥{{ staff.part_time_settings.hourlywage }}/h
              </template>
            </p>
          </div>
          <ArrowRightIcon class="h-4 w-4 shrink-0 text-slate-300" />
        </NuxtLink>
      </li>
    </ul>

  </div>
</template>
