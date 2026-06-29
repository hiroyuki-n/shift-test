<script setup lang="ts">
definePageMeta({ layout: 'shop' })

type EmploymentType = 'PART_TIME' | 'FULL_TIME'

interface Staff { id: number; name: string; employmentType: EmploymentType | null }
interface ShopDetail { shop: { id: number; name: string }; staff: Staff[] }
interface FinalShift {
  id: number; date: string; startTime: string; endTime: string
  userId: number; shopId: number
}

const route  = useRoute()
const shopId = computed(() => route.params.shopId as string)

const today = new Date()
const currentMonth = ref(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`)

function prevMonth() {
  const [y, m] = currentMonth.value.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  currentMonth.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function nextMonth() {
  const [y, m] = currentMonth.value.split('-').map(Number)
  const d = new Date(y, m, 1)
  currentMonth.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const monthLabel = computed(() => {
  const [y, m] = currentMonth.value.split('-').map(Number)
  return `${y}年${m}月`
})

const { data: shopData } = await useFetch<ShopDetail>(
  () => `/api/shops/${shopId.value}`,
)
const { data: finalShifts } = await useFetch<FinalShift[]>('/api/final-shifts', {
  query: { shopId, month: currentMonth },
  default: () => [],
})

// 月の総日数・平日数
const monthStats = computed(() => {
  const [y, m] = currentMonth.value.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  let weekdays = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(y, m - 1, d).getDay()
    if (day !== 0 && day !== 6) weekdays++
  }
  return { daysInMonth, weekdays }
})

// UTC+9 で分に変換
function toJSTMinutes(iso: string): number {
  const d = new Date(iso)
  return (d.getUTCHours() * 60 + d.getUTCMinutes() + 540) % 1440
}
function durationHours(s: string, e: string): number {
  return (toJSTMinutes(e) - toJSTMinutes(s)) / 60
}

// スタッフ別稼働集計
const staffStats = computed(() => {
  const staff = shopData.value?.staff ?? []
  const { daysInMonth, weekdays } = monthStats.value

  return staff.map(s => {
    const shifts = finalShifts.value.filter(f => f.userId === s.id)
    const workedDays = new Set(shifts.map(f => f.date)).size
    const totalHours = shifts.reduce((sum, f) => sum + durationHours(f.startTime, f.endTime), 0)
    const target = s.employmentType === 'FULL_TIME' ? weekdays : daysInMonth
    const rate = target > 0 ? (workedDays / target) * 100 : 0

    return {
      id: s.id,
      name: s.name,
      employmentType: s.employmentType,
      workedDays,
      totalHours: Math.round(totalHours * 10) / 10,
      rate: Math.min(rate, 100),
    }
  }).sort((a, b) => b.rate - a.rate)
})

const totalHours = computed(() =>
  Math.round(staffStats.value.reduce((s, v) => s + v.totalHours, 0) * 10) / 10,
)

const employmentLabel: Record<EmploymentType, string> = {
  PART_TIME: 'アルバイト',
  FULL_TIME: '社員',
}
</script>

<template>
  <div class="mx-auto max-w-4xl p-8">

    <!-- ヘッダー -->
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-xl font-bold text-slate-800">ダッシュボード</h1>
      <div class="flex items-center gap-2">
        <button class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100" @click="prevMonth">‹ 前月</button>
        <span class="text-sm font-semibold text-slate-700">{{ monthLabel }}</span>
        <button class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100" @click="nextMonth">翌月 ›</button>
      </div>
    </div>

    <!-- サマリーカード -->
    <div class="mb-6 grid grid-cols-2 gap-4">
      <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-xs text-slate-400">スタッフ数</p>
        <p class="mt-1 text-3xl font-bold text-slate-800">{{ staffStats.length }}</p>
        <p class="mt-0.5 text-xs text-slate-400">名</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-xs text-slate-400">総勤務時間</p>
        <p class="mt-1 text-3xl font-bold text-slate-800">{{ totalHours }}</p>
        <p class="mt-0.5 text-xs text-slate-400">時間</p>
      </div>
    </div>


    <!-- 勤務時間グラフ -->
    <section class="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-sm font-semibold text-slate-700">スタッフ別勤務時間</h2>
        <div class="flex gap-3 text-xs text-slate-400">
          <span class="flex items-center gap-1.5">
            <span class="inline-block h-2.5 w-2.5 rounded-sm bg-indigo-400" />社員
          </span>
          <span class="flex items-center gap-1.5">
            <span class="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-300" />アルバイト
          </span>
        </div>
      </div>
      <ClientOnly>
        <StaffUtilizationChart :stats="staffStats" :days-in-month="monthStats.daysInMonth" />
        <template #fallback>
          <div class="h-40 animate-pulse rounded-xl bg-slate-100" />
        </template>
      </ClientOnly>
    </section>

    <!-- スタッフ別詳細テーブル -->
    <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="border-b border-slate-100 px-6 py-4">
        <h2 class="text-sm font-semibold text-slate-700">スタッフ別詳細</h2>
      </div>
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th class="px-6 py-3 text-left">氏名</th>
            <th class="px-6 py-3 text-left">雇用形態</th>
            <th class="px-6 py-3 text-right">出勤日数</th>
            <th class="px-6 py-3 text-right">勤務時間</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="s in staffStats" :key="s.id" class="hover:bg-slate-50">
            <td class="px-6 py-3 font-medium text-slate-800">{{ s.name }}</td>
            <td class="px-6 py-3">
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="s.employmentType === 'FULL_TIME' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'"
              >{{ s.employmentType ? employmentLabel[s.employmentType] : '—' }}</span>
            </td>
            <td class="px-6 py-3 text-right text-slate-700">{{ s.workedDays }} 日</td>
            <td class="px-6 py-3 text-right text-slate-700">{{ s.totalHours }} h</td>
          </tr>
          <tr v-if="staffStats.length === 0">
            <td colspan="4" class="px-6 py-10 text-center text-sm text-slate-400">
              この月の確定シフトはありません
            </td>
          </tr>
        </tbody>
      </table>
    </section>

  </div>
</template>
