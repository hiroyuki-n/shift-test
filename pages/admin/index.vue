<script setup lang="ts">
import { BuildingStorefrontIcon, UserGroupIcon, ClockIcon } from '@heroicons/vue/24/outline'

definePageMeta({ layout: 'admin' })
useHead({ title: 'ダッシュボード' })

interface Shop { id: number; name: string; createdAt: string; staffCount: number }
interface FinalShift { date: string; userId: number; shopId: number; hourlywage: number | null }
interface AttendanceRecord {
  date: string; userId: number; shopId: number
  startTime: string | null; endTime: string | null
  breakStartTime: string | null; breakEndTime: string | null; isAbsent: boolean
}

const today = new Date()
const currentYear = today.getFullYear()

// 直近6ヶ月のリスト
const recentMonths = Array.from({ length: 6 }, (_, i) => {
  const d = new Date(today.getFullYear(), today.getMonth() - 5 + i, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
})
const fromMonth = recentMonths[0]
const toMonth   = recentMonths[5]

const { data: shops } = await useFetch<Shop[]>('/api/shops', { default: () => [] })
const { data: stats } = await useFetch<{ pendingRequests: number }>('/api/stats', {
  default: () => ({ pendingRequests: 0 }),
})
const { data: finalShifts } = await useFetch<FinalShift[]>('/api/final-shifts', {
  query: { year: currentYear }, default: () => [],
})
const { data: attendanceRecords } = await useFetch<AttendanceRecord[]>('/api/attendance-records', {
  query: { year: currentYear }, default: () => [],
})

const dashboard = computed(() => ({
  shopCount:      shops.value.length,
  staffTotal:     shops.value.reduce((sum, s) => sum + s.staffCount, 0),
  pendingRequests: stats.value?.pendingRequests ?? 0,
}))

// 人件費計算
function isoToMin(iso: string | null): number {
  if (!iso) return 0
  const d = new Date(iso)
  return (d.getUTCHours() * 60 + d.getUTCMinutes() + 540) % 1440
}

function calcCost(rec: AttendanceRecord): number {
  if (rec.isAbsent || !rec.startTime || !rec.endTime) return 0
  const shift = finalShifts.value.find(s => s.userId === rec.userId && s.date === rec.date)
  if (!shift?.hourlywage) return 0
  const workMin  = isoToMin(rec.endTime) - isoToMin(rec.startTime)
  const breakMin = rec.breakStartTime && rec.breakEndTime
    ? isoToMin(rec.breakEndTime) - isoToMin(rec.breakStartTime) : 0
  return Math.round(Math.max(0, workMin - breakMin) / 60 * shift.hourlywage)
}

// 店舗×月の人件費マップ
const costByShopMonth = computed(() => {
  const map: Record<number, Record<string, number>> = {}
  for (const rec of attendanceRecords.value) {
    const month = rec.date.slice(0, 7)
    if (!recentMonths.includes(month)) continue
    if (!map[rec.shopId]) map[rec.shopId] = {}
    map[rec.shopId][month] = (map[rec.shopId][month] ?? 0) + calcCost(rec)
  }
  return map
})

// 今月の人件費合計
const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
const thisMonthTotal = computed(() =>
  Object.values(costByShopMonth.value).reduce((sum, m) => sum + (m[thisMonth] ?? 0), 0)
)

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('ja-JP')
}
</script>

<template>
  <div class="mx-auto max-w-5xl p-8">
      <!-- ヘッダー -->
      <header class="mb-8">
        <h1 class="text-2xl font-bold text-slate-800">本社管理ダッシュボード</h1>
      </header>

      <!-- KPIカード -->
      <section class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <article class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex items-center gap-2 text-slate-500">
            <BuildingStorefrontIcon class="h-4 w-4" />
            <p class="text-sm">登録店舗数</p>
          </div>
          <p class="mt-1 text-3xl font-bold text-slate-800">{{ dashboard.shopCount }}</p>
        </article>
        <article class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex items-center gap-2 text-slate-500">
            <UserGroupIcon class="h-4 w-4" />
            <p class="text-sm">総スタッフ数</p>
          </div>
          <p class="mt-1 text-3xl font-bold text-slate-800">{{ dashboard.staffTotal }}</p>
        </article>
        <article class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex items-center gap-2 text-slate-500">
            <ClockIcon class="h-4 w-4" />
            <p class="text-sm">承認待ちシフト</p>
          </div>
          <p class="mt-1 text-3xl font-bold text-amber-500">{{ dashboard.pendingRequests }}</p>
        </article>
        <article class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-sm text-slate-500">今月の人件費</p>
          <p class="mt-1 text-2xl font-bold text-indigo-600">¥{{ thisMonthTotal.toLocaleString() }}</p>
        </article>
      </section>

      <!-- 人件費チャート -->
      <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-sm font-semibold text-slate-700">店舗別人件費（直近6ヶ月）</h2>
        </div>
        <ClientOnly>
          <LaborCostChart
            :months="recentMonths"
            :shops="shops.map(s => ({ id: Number(s.id), name: s.name }))"
            :cost-by-shop-month="costByShopMonth"
          />
          <template #fallback>
            <div class="h-64 animate-pulse rounded-xl bg-slate-100" />
          </template>
        </ClientOnly>
      </section>

  </div>
</template>
