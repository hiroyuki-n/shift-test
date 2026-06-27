<script setup lang="ts">
import { ArrowLeftIcon, ArrowRightIcon, BuildingStorefrontIcon } from '@heroicons/vue/24/outline'

definePageMeta({ layout: 'admin' })

type EmploymentType = 'PART_TIME' | 'FULL_TIME'

interface Staff {
  id: number
  name: string
  employmentType: EmploymentType | null
  role: string
}

interface ShopDetail {
  shop: { id: number; name: string; createdAt: string }
  staff: Staff[]
}

const route  = useRoute()
const shopId = route.params.shopId as string

const { data, pending } = await useFetch<ShopDetail>(`/api/shops/${shopId}`)

const employmentLabel: Record<EmploymentType, string> = {
  PART_TIME: 'アルバイト',
  FULL_TIME: '社員',
}

const partTimeCount = computed(() =>
  data.value?.staff.filter(s => s.employmentType === 'PART_TIME').length ?? 0,
)
const fullTimeCount = computed(() =>
  data.value?.staff.filter(s => s.employmentType === 'FULL_TIME').length ?? 0,
)

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}
</script>

<template>
  <div class="mx-auto max-w-3xl p-8">

    <!-- ヘッダー -->
    <header class="mb-8">
      <NuxtLink to="/admin/shops" class="mb-3 inline-flex items-center gap-1 text-xs text-slate-400 hover:underline">
        <ArrowLeftIcon class="h-3.5 w-3.5" />店舗一覧へ戻る
      </NuxtLink>

      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
            <BuildingStorefrontIcon class="h-5 w-5 text-brand" />
          </div>
          <div>
            <h1 class="text-2xl font-bold text-slate-800">{{ data?.shop?.name ?? '—' }}</h1>
            <p class="mt-0.5 text-xs text-slate-400">
              登録日：{{ data?.shop?.createdAt ? formatDate(data.shop.createdAt) : '—' }}
            </p>
          </div>
        </div>
        <NuxtLink
          :to="`/shop/${shopId}`"
          class="inline-flex items-center gap-1.5 rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand transition hover:bg-brand hover:text-white"
        >
          店舗管理画面へ<ArrowRightIcon class="h-4 w-4" />
        </NuxtLink>
      </div>
    </header>

    <p v-if="pending" class="py-10 text-center text-sm text-slate-400">読み込み中…</p>

    <template v-else>

      <!-- サマリー -->
      <div class="mb-6 grid grid-cols-3 gap-4">
        <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm text-center">
          <p class="text-xs text-slate-400">総スタッフ数</p>
          <p class="mt-1 text-3xl font-bold text-slate-800">{{ data?.staff.length ?? 0 }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm text-center">
          <p class="text-xs text-slate-400">アルバイト</p>
          <p class="mt-1 text-3xl font-bold text-slate-600">{{ partTimeCount }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm text-center">
          <p class="text-xs text-slate-400">社員</p>
          <p class="mt-1 text-3xl font-bold text-indigo-600">{{ fullTimeCount }}</p>
        </div>
      </div>

      <!-- スタッフ一覧 -->
      <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="border-b border-slate-100 px-6 py-4">
          <h2 class="text-sm font-semibold text-slate-700">所属スタッフ</h2>
        </div>

        <p v-if="data?.staff.length === 0" class="px-6 py-10 text-center text-sm text-slate-400">
          スタッフが登録されていません
        </p>

        <table v-else class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th class="px-6 py-3">ID</th>
              <th class="px-6 py-3">氏名</th>
              <th class="px-6 py-3">雇用形態</th>
              <th class="px-6 py-3 text-right">詳細</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="staff in data?.staff" :key="staff.id" class="hover:bg-slate-50">
              <td class="px-6 py-4 font-mono text-xs text-slate-400">{{ staff.id }}</td>
              <td class="px-6 py-4 font-medium text-slate-800">{{ staff.name }}</td>
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

    </template>
  </div>
</template>
