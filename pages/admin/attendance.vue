<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useHead({ title: '勤怠報告' })

interface Shop { id: number; name: string }
interface AttendanceRecord {
  id: number; date: string; userId: number; shopId: number
  startTime: string | null; endTime: string | null
  breakStartTime: string | null; breakEndTime: string | null
  overtimeMinutes: number | null; isAbsent: boolean
  users: { name: string; employmentType: string | null } | null
}
interface FinalShift {
  id: number; date: string; userId: number; shopId: number
  startTime: string; endTime: string; hourlywage: number | null
  users: { name: string; employmentType: string | null } | null
}

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

const { data: shops } = await useFetch<Shop[]>('/api/shops', { default: () => [] })
const activeShopId = ref<number>(0)
watch(shops, s => { if (s.length && !activeShopId.value) activeShopId.value = s[0].id }, { immediate: true })

const { data: finalShifts } = await useFetch<FinalShift[]>('/api/final-shifts', {
  query: { month: currentMonth }, default: () => [],
})
const { data: records } = await useFetch<AttendanceRecord[]>('/api/attendance-records', {
  query: { month: currentMonth }, default: () => [],
})

// アルバイトのみ
const ptShifts  = computed(() => finalShifts.value.filter(s => s.users?.employmentType !== 'FULL_TIME'))

// 月の日付リスト（シフトがある日のみ）
const activeDays = computed(() => {
  const [y, m] = currentMonth.value.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return Array.from({ length: last }, (_, i) => {
    const d = i + 1
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }).filter(date =>
    ptShifts.value.some(s => s.shopId === activeShopId.value && s.date === date)
  )
})

// 日付ごとの集計
function dayStats(date: string) {
  const shifts = ptShifts.value.filter(s => s.shopId === activeShopId.value && s.date === date)
  const recs   = records.value.filter(r => r.shopId === activeShopId.value && r.date === date)
  return { shifts, recs, total: shifts.length, recorded: recs.length }
}

function status(total: number, recorded: number): 'done' | 'partial' | 'missing' {
  if (recorded >= total) return 'done'
  if (recorded > 0)      return 'partial'
  return 'missing'
}
const STATUS = {
  done:    { label: '完了',  row: 'bg-emerald-50/50', badge: 'bg-emerald-100 text-emerald-700' },
  partial: { label: '一部',  row: 'bg-amber-50/50',   badge: 'bg-amber-100   text-amber-700'   },
  missing: { label: '未提出', row: 'bg-rose-50/30',    badge: 'bg-rose-100    text-rose-600'    },
}

// 人件費計算
function isoToMin(iso: string | null): number {
  if (!iso) return 0
  const d = new Date(iso)
  return (d.getUTCHours() * 60 + d.getUTCMinutes() + 540) % 1440
}

function calcCost(rec: AttendanceRecord): number {
  if (rec.isAbsent || !rec.startTime || !rec.endTime) return 0
  const shift = ptShifts.value.find(s => s.userId === rec.userId && s.date === rec.date)
  if (!shift?.hourlywage) return 0
  const workMin  = isoToMin(rec.endTime) - isoToMin(rec.startTime)
  const breakMin = rec.breakStartTime && rec.breakEndTime
    ? isoToMin(rec.breakEndTime) - isoToMin(rec.breakStartTime) : 0
  return Math.round(Math.max(0, workMin - breakMin) / 60 * shift.hourlywage)
}

function dayCost(date: string): number {
  return records.value
    .filter(r => r.shopId === activeShopId.value && r.date === date)
    .reduce((sum, r) => sum + calcCost(r), 0)
}

const monthlyLaborCost = computed(() =>
  activeDays.value.reduce((sum, d) => sum + dayCost(d), 0)
)

// 月サマリー
const monthlySummary = computed(() => {
  const days   = activeDays.value
  const done   = days.filter(d => { const s = dayStats(d); return s.recorded >= s.total }).length
  const partial = days.filter(d => { const s = dayStats(d); return s.recorded > 0 && s.recorded < s.total }).length
  const missing = days.filter(d => dayStats(d).recorded === 0).length
  return { total: days.length, done, partial, missing }
})

// 開閉状態
const openDates = ref<Set<string>>(new Set())
function toggle(date: string) {
  const s = new Set(openDates.value)
  s.has(date) ? s.delete(date) : s.add(date)
  openDates.value = s
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const min = (d.getUTCHours() * 60 + d.getUTCMinutes() + 540) % 1440
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}
function dateLabel(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00+09:00`).toLocaleDateString('ja-JP', {
    month: 'numeric', day: 'numeric', weekday: 'short',
  })
}
</script>

<template>
  <div class="mx-auto max-w-4xl p-6 lg:p-8">

    <!-- ヘッダー -->
    <header class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-slate-800">勤怠報告</h1>
      <div class="flex items-center gap-2">
        <button class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100" @click="prevMonth">‹ 前月</button>
        <span class="min-w-24 text-center text-sm font-semibold text-slate-700">{{ monthLabel }}</span>
        <button class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100" @click="nextMonth">翌月 ›</button>
      </div>
    </header>

    <!-- 店舗タブ -->
    <div class="mb-6 flex gap-2 overflow-x-auto">
      <button
        v-for="shop in shops" :key="shop.id"
        class="shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition"
        :class="activeShopId === shop.id
          ? 'bg-brand text-white'
          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
        @click="activeShopId = shop.id; openDates = new Set()"
      >{{ shop.name }}</button>
    </div>

    <!-- サマリー -->
    <div v-if="activeDays.length > 0" class="mb-5 grid grid-cols-3 gap-3">
      <div class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center">
        <p class="text-xs text-emerald-600">完了</p>
        <p class="text-2xl font-bold text-emerald-700">{{ monthlySummary.done }}</p>
        <p class="text-xs text-emerald-500">日</p>
      </div>
      <div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center">
        <p class="text-xs text-amber-600">一部提出</p>
        <p class="text-2xl font-bold text-amber-700">{{ monthlySummary.partial }}</p>
        <p class="text-xs text-amber-500">日</p>
      </div>
      <div class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-center">
        <p class="text-xs text-rose-600">未提出</p>
        <p class="text-2xl font-bold text-rose-700">{{ monthlySummary.missing }}</p>
        <p class="text-xs text-rose-500">日</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm">
        <p class="text-xs text-slate-500">人件費合計</p>
        <p class="mt-1 text-xl font-bold text-slate-800">¥{{ monthlyLaborCost.toLocaleString() }}</p>
      </div>
    </div>

    <!-- 日付リスト -->
    <section v-if="activeDays.length > 0" class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div
        v-for="date in activeDays"
        :key="date"
        class="border-b border-slate-100 last:border-b-0"
      >
        <!-- 日付行（クリックで開閉） -->
        <button
          class="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-slate-50"
          :class="STATUS[status(dayStats(date).total, dayStats(date).recorded)].row"
          @click="toggle(date)"
        >
          <span class="w-32 shrink-0 text-sm font-semibold text-slate-700">{{ dateLabel(date) }}</span>
          <span
            class="rounded-full px-2.5 py-0.5 text-xs font-medium"
            :class="STATUS[status(dayStats(date).total, dayStats(date).recorded)].badge"
          >{{ STATUS[status(dayStats(date).total, dayStats(date).recorded)].label }}</span>
          <span class="text-xs text-slate-400">{{ dayStats(date).recorded }}/{{ dayStats(date).total }}人</span>
          <span v-if="dayCost(date) > 0" class="text-xs font-medium text-slate-600">¥{{ dayCost(date).toLocaleString() }}</span>
          <span class="ml-auto text-slate-300 text-xs">{{ openDates.has(date) ? '▲' : '▼' }}</span>
        </button>

        <!-- 展開：スタッフ詳細 -->
        <div v-if="openDates.has(date)" class="border-t border-slate-100 bg-slate-50/50">
          <table class="w-full text-xs">
            <thead>
              <tr class="border-b border-slate-100 text-slate-400">
                <th class="px-6 py-2 text-left font-medium">スタッフ</th>
                <th class="px-4 py-2 text-left font-medium">出勤</th>
                <th class="px-4 py-2 text-left font-medium">退勤</th>
                <th class="px-4 py-2 text-left font-medium">休憩</th>
                <th class="px-4 py-2 text-center font-medium">残業(分)</th>
                <th class="px-4 py-2 text-right font-medium">人件費</th>
                <th class="px-4 py-2 text-center font-medium">状態</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="shift in dayStats(date).shifts" :key="shift.id" class="bg-white">
                <td class="px-6 py-2 font-medium text-slate-800">{{ shift.users?.name ?? '—' }}</td>
                <template v-if="dayStats(date).recs.find(r => r.userId === shift.userId)">
                  <template v-if="dayStats(date).recs.find(r => r.userId === shift.userId)!.isAbsent">
                    <td colspan="4" class="px-4 py-2 font-medium text-rose-500">欠勤</td>
                    <td class="px-4 py-2 text-right text-slate-300">—</td>
                    <td class="px-4 py-2 text-center"><span class="rounded-full bg-rose-100 px-2 py-0.5 text-rose-600">欠勤</span></td>
                  </template>
                  <template v-else>
                    <td class="px-4 py-2 text-slate-600">{{ formatTime(dayStats(date).recs.find(r => r.userId === shift.userId)!.startTime) }}</td>
                    <td class="px-4 py-2 text-slate-600">{{ formatTime(dayStats(date).recs.find(r => r.userId === shift.userId)!.endTime) }}</td>
                    <td class="px-4 py-2 text-slate-600">
                      <span v-if="dayStats(date).recs.find(r => r.userId === shift.userId)!.breakStartTime">
                        {{ formatTime(dayStats(date).recs.find(r => r.userId === shift.userId)!.breakStartTime) }}〜{{ formatTime(dayStats(date).recs.find(r => r.userId === shift.userId)!.breakEndTime) }}
                      </span>
                      <span v-else class="text-slate-300">—</span>
                    </td>
                    <td class="px-4 py-2 text-center text-slate-600">{{ dayStats(date).recs.find(r => r.userId === shift.userId)!.overtimeMinutes ?? '—' }}</td>
                    <td class="px-4 py-2 text-right font-medium text-slate-700">
                      {{ calcCost(dayStats(date).recs.find(r => r.userId === shift.userId)!) > 0
                        ? `¥${calcCost(dayStats(date).recs.find(r => r.userId === shift.userId)!).toLocaleString()}`
                        : '—' }}
                    </td>
                    <td class="px-4 py-2 text-center"><span class="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">提出済</span></td>
                  </template>
                </template>
                <template v-else>
                  <td colspan="5" class="px-4 py-2 text-slate-300">未提出</td>
                  <td class="px-4 py-2 text-center"><span class="rounded-full bg-slate-100 px-2 py-0.5 text-slate-400">未提出</span></td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- シフトなし -->
    <div v-else class="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400 shadow-sm">
      この月の確定シフトがありません
    </div>

  </div>
</template>
