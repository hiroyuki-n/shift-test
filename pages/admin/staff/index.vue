<script setup lang="ts">
import { ArrowRightIcon, UserPlusIcon } from '@heroicons/vue/24/outline'

definePageMeta({ layout: 'admin' })

interface Staff {
  id: number
  name: string
  role: string
  employmentType: 'PART_TIME' | 'FULL_TIME' | null
  primaryShopId: number | null
  createdAt: string
  full_time_settings: { workpattern: string | null } | null
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

const fullTimeStaff = computed(() =>
  staffList.value.filter(s => s.employmentType === 'FULL_TIME').sort((a, b) => a.id - b.id),
)
const partTimeStaff = computed(() =>
  staffList.value.filter(s => s.employmentType === 'PART_TIME').sort((a, b) => a.id - b.id),
)

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}
</script>

<template>
  <div class="mx-auto max-w-4xl p-8">

    <header class="mb-6">
      <h1 class="text-xl font-bold text-slate-800">スタッフ一覧</h1>
      <p class="mt-0.5 text-sm text-slate-500">
        社員 {{ fullTimeStaff.length }} 名 ／ アルバイト {{ partTimeStaff.length }} 名
      </p>
    </header>

    <p v-if="pending" class="py-10 text-center text-sm text-slate-400">読み込み中…</p>

    <template v-else>

      <!-- 社員 -->
      <section class="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="border-b border-slate-100 px-6 py-3 flex items-center justify-between">
          <h2 class="text-sm font-semibold text-slate-700">社員</h2>
          <span class="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
            {{ fullTimeStaff.length }} 名
          </span>
        </div>
        <p v-if="fullTimeStaff.length === 0" class="px-6 py-8 text-center text-sm text-slate-400">
          社員が登録されていません
        </p>
        <table v-else class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th class="px-6 py-3">ID</th>
              <th class="px-6 py-3">氏名</th>
              <th class="px-6 py-3">所属店舗</th>
              <th class="px-6 py-3">登録日</th>
              <th class="px-6 py-3 text-right">詳細</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="staff in fullTimeStaff" :key="staff.id" class="hover:bg-slate-50">
              <td class="px-6 py-3 font-mono text-xs text-slate-400">{{ staff.id }}</td>
              <td class="px-6 py-3 font-medium text-slate-800">{{ staff.name }}</td>
              <td class="px-6 py-3 text-slate-600">{{ staff.primaryShopId ? shopMap.get(staff.primaryShopId) ?? '—' : '—' }}</td>
              <td class="px-6 py-3 text-xs text-slate-500">{{ staff.createdAt ? formatDate(staff.createdAt) : '—' }}</td>
              <td class="px-6 py-3 text-right">
                <NuxtLink :to="`/admin/staff/${staff.id}`" class="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
                  詳細<ArrowRightIcon class="h-3.5 w-3.5" />
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- アルバイト -->
      <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="border-b border-slate-100 px-6 py-3 flex items-center justify-between">
          <h2 class="text-sm font-semibold text-slate-700">アルバイト</h2>
          <span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {{ partTimeStaff.length }} 名
          </span>
        </div>
        <p v-if="partTimeStaff.length === 0" class="px-6 py-8 text-center text-sm text-slate-400">
          アルバイトが登録されていません
        </p>
        <table v-else class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th class="px-6 py-3">ID</th>
              <th class="px-6 py-3">氏名</th>
              <th class="px-6 py-3">所属店舗</th>
              <th class="px-6 py-3">時給</th>
              <th class="px-6 py-3">登録日</th>
              <th class="px-6 py-3 text-right">詳細</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="staff in partTimeStaff" :key="staff.id" class="hover:bg-slate-50">
              <td class="px-6 py-3 font-mono text-xs text-slate-400">{{ staff.id }}</td>
              <td class="px-6 py-3 font-medium text-slate-800">{{ staff.name }}</td>
              <td class="px-6 py-3 text-slate-600">{{ staff.primaryShopId ? shopMap.get(staff.primaryShopId) ?? '—' : '—' }}</td>
              <td class="px-6 py-3 text-slate-600">
                {{ staff.part_time_settings?.hourlywage != null ? `${staff.part_time_settings.hourlywage} 円` : '—' }}
              </td>
              <td class="px-6 py-3 text-xs text-slate-500">{{ staff.createdAt ? formatDate(staff.createdAt) : '—' }}</td>
              <td class="px-6 py-3 text-right">
                <NuxtLink :to="`/admin/staff/${staff.id}`" class="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
                  詳細<ArrowRightIcon class="h-3.5 w-3.5" />
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

    </template>
  </div>
</template>
