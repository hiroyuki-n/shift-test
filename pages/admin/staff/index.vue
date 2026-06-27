<script setup lang="ts">
import { ArrowRightIcon } from '@heroicons/vue/24/outline'

definePageMeta({ layout: 'admin' })

interface Staff {
  id: number
  name: string
  role: string
  employmentType: 'PART_TIME' | 'FULL_TIME' | null
  primaryShopId: number | null
}

interface Shop {
  id: number
  name: string
}

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
  <div class="mx-auto max-w-4xl p-8">

    <header class="mb-6">
      <h1 class="text-xl font-bold text-slate-800">スタッフ一覧</h1>
      <p class="mt-0.5 text-sm text-slate-500">{{ sortedStaff.length }} 名</p>
    </header>

    <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
      <p v-if="pending" class="px-6 py-10 text-center text-sm text-slate-400">読み込み中…</p>
      <p v-else-if="sortedStaff.length === 0" class="px-6 py-10 text-center text-sm text-slate-400">
        スタッフが登録されていません
      </p>
      <table v-else class="w-full text-left text-sm">
        <thead class="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th class="px-6 py-3">ID</th>
            <th class="px-6 py-3">氏名</th>
            <th class="px-6 py-3">所属店舗</th>
            <th class="px-6 py-3">雇用形態</th>
            <th class="px-6 py-3 text-right">詳細</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="staff in sortedStaff" :key="staff.id" class="hover:bg-slate-50">
            <td class="px-6 py-4 font-mono text-xs text-slate-400">{{ staff.id }}</td>
            <td class="px-6 py-4 font-medium text-slate-800">{{ staff.name }}</td>
            <td class="px-6 py-4 text-slate-600">
              {{ staff.primaryShopId ? shopMap.get(staff.primaryShopId) ?? '—' : '—' }}
            </td>
            <td class="px-6 py-4">
              <span
                class="rounded-full px-2.5 py-0.5 text-xs font-medium"
                :class="staff.employmentType === 'FULL_TIME'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-slate-100 text-slate-600'"
              >
                {{ staff.employmentType ? employmentLabel[staff.employmentType] : '—' }}
              </span>
            </td>
            <td class="px-6 py-4 text-right">
              <NuxtLink
                :to="`/admin/staff/${staff.id}`"
                class="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
              >
                詳細<ArrowRightIcon class="h-3.5 w-3.5" />
              </NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

  </div>
</template>
