<script setup lang="ts">
type EmploymentType = 'PART_TIME' | 'FULL_TIME'
type ShiftStatus    = 'PENDING' | 'APPROVED' | 'REJECTED'

interface FinalShift {
  id: number
  date: string
  startTime: string
  endTime: string
  positionId: number | null
  userId: number
  shopId: number
  users: { name: string } | null
  shop_positions: { name: string } | null
}

interface ShiftRequest {
  id: number
  date: string
  startTime: string
  endTime: string
  status: ShiftStatus
  note: string | null
  userId: number
  shopId: number
  users: { name: string; employmentType: EmploymentType | null } | null
}

definePageMeta({ layout: 'shop' })
useHead({ title: 'シフト管理' })

const route  = useRoute()
const shopId = computed(() => route.params.shopId as string)

const today = new Date()
const currentMonth = ref(
  `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
)

const { pending, error } = await useFetch(
  () => `/api/shops/${shopId.value}`,
)

const { data: shifts } = await useFetch<FinalShift[]>('/api/final-shifts', {
  query: { shopId, month: currentMonth },
  default: () => [],
})

const { data: requests } = await useFetch<ShiftRequest[]>('/api/shift-requests', {
  query: { shopId, month: currentMonth },
  default: () => [],
})

// --- 月ナビゲーション ---
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

const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
const weekDayLabels = ['月', '火', '水', '木', '金', '土', '日']

// --- カレンダー日付生成（月曜始まり） ---
const calendarCells = computed(() => {
  const [y, m] = currentMonth.value.split('-').map(Number)
  const firstDay  = new Date(y, m - 1, 1)
  const lastDate  = new Date(y, m, 0).getDate()
  const startOffset = (firstDay.getDay() + 6) % 7
  const cells: Array<{ day: number; dateStr: string; shifts: FinalShift[] } | null> = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= lastDate; d++) {
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, dateStr, shifts: shifts.value.filter(s => s.date === dateStr) })
  }
  return cells
})

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

// --- 日別の確定・未確定集計 ---
interface DayStats { confirmed: number; pending: number }

const dayStatsMap = computed(() => {
  const map = new Map<string, DayStats>()
  const get = (d: string) => map.get(d) ?? { confirmed: 0, pending: 0 }
  for (const s of shifts.value) {
    const e = get(s.date); e.confirmed++; map.set(s.date, e)
  }
  for (const r of requests.value) {
    if (r.status === 'PENDING') {
      const e = get(r.date); e.pending++; map.set(r.date, e)
    }
  }
  return map
})

const statusCalendarCells = computed(() => {
  const [y, m] = currentMonth.value.split('-').map(Number)
  const firstDay    = new Date(y, m - 1, 1)
  const lastDate    = new Date(y, m, 0).getDate()
  const startOffset = (firstDay.getDay() + 6) % 7
  const cells: Array<{ day: number; dateStr: string; stats: DayStats; isToday: boolean } | null> = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= lastDate; d++) {
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({
      day: d, dateStr,
      stats:   dayStatsMap.value.get(dateStr) ?? { confirmed: 0, pending: 0 },
      isToday: dateStr === todayStr,
    })
  }
  return cells
})

function statusCellClass(stats: DayStats, isToday: boolean) {
  if (isToday) return 'border-2 border-brand bg-white text-slate-700'
  if (stats.pending > 0)   return 'bg-amber-200 text-amber-800 border-slate-100'
  if (stats.confirmed > 0) return 'bg-emerald-200 text-emerald-800 border-slate-100'
  return 'bg-slate-100 text-slate-400 border-slate-100'
}
</script>

<template>
  <div class="mx-auto max-w-5xl p-8">

    <p v-if="pending" class="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
      読み込み中…
    </p>
    <p v-else-if="error" class="rounded-xl border border-rose-200 bg-white p-8 text-center text-sm text-rose-600">
      データの取得に失敗しました（{{ error.statusMessage || error.message }}）
    </p>

    <template v-else>

      <!-- 月ナビゲーション -->
      <div class="mb-6 flex items-center justify-between">
        <h2 class="text-lg font-bold text-slate-800">{{ monthLabel }}</h2>
        <div class="flex items-center gap-2">
          <button
            class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            @click="prevMonth"
          >‹ 前月</button>
          <button
            class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            @click="nextMonth"
          >翌月 ›</button>
        </div>
      </div>

      <!-- 確定状況カレンダー -->
      <section class="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="flex items-center justify-between border-b border-slate-100 px-6 py-3">
          <h3 class="text-sm font-semibold text-slate-700">確定状況</h3>
          <div class="flex items-center gap-4 text-xs text-slate-500">
            <span class="flex items-center gap-1.5">
              <span class="inline-block h-3 w-5 rounded bg-emerald-200" />確定
            </span>
            <span class="flex items-center gap-1.5">
              <span class="inline-block h-3 w-5 rounded bg-amber-200" />保留あり（未確定）
            </span>
            <span class="flex items-center gap-1.5">
              <span class="inline-block h-3 w-5 rounded bg-slate-100" />データなし
            </span>
          </div>
        </div>
        <div class="p-4">
          <div class="grid grid-cols-7">
            <div
              v-for="(label, i) in weekDayLabels" :key="label"
              class="pb-1.5 text-center text-xs font-semibold"
              :class="i === 5 ? 'text-blue-500' : i === 6 ? 'text-rose-500' : 'text-slate-400'"
            >{{ label }}</div>
          </div>
          <div class="grid grid-cols-7 gap-0.5">
            <div v-for="(cell, i) in statusCalendarCells" :key="i">
              <button
                v-if="cell"
                class="flex h-10 w-full flex-col items-center justify-center rounded-md border transition hover:opacity-75"
                :class="statusCellClass(cell.stats, cell.isToday)"
                @click="navigateTo(`/shop/${shopId}/${cell.dateStr}`)"
              >
                <span class="text-xs font-medium leading-none" :class="cell.isToday ? 'text-brand' : ''">
                  {{ cell.day }}
                </span>
              </button>
              <div v-else class="h-10" />
            </div>
          </div>
        </div>
      </section>

      <!-- シフト詳細カレンダー -->
      <section class="mb-8 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="border-b border-slate-100 px-6 py-4">
          <h2 class="text-lg font-semibold text-slate-800">シフトカレンダー</h2>
        </div>
        <div class="overflow-x-auto p-4">
          <div class="grid grid-cols-7 gap-1">
            <div
              v-for="(label, i) in weekDayLabels" :key="label"
              class="py-2 text-center text-xs font-semibold"
              :class="i === 5 ? 'text-blue-500' : i === 6 ? 'text-rose-500' : 'text-slate-500'"
            >{{ label }}</div>

            <div
              v-for="(cell, i) in calendarCells" :key="i"
              class="min-h-24 rounded-lg border p-1.5"
              :class="!cell ? 'border-transparent' : cell.dateStr === todayStr ? 'border-brand bg-brand/5' : 'border-slate-100 bg-white'"
            >
              <template v-if="cell">
                <button
                  class="mb-1 block w-full text-right text-xs font-semibold hover:underline"
                  :class="cell.dateStr === todayStr ? 'text-brand' : 'text-slate-500'"
                  @click="navigateTo(`/shop/${shopId}/${cell.dateStr}`)"
                >{{ cell.day }}</button>
                <ul class="space-y-0.5">
                  <li
                    v-for="shift in cell.shifts" :key="shift.id"
                    class="rounded bg-blue-50 px-1 py-0.5 text-xs leading-tight text-blue-700"
                  >
                    <p class="font-medium">{{ shift.users?.name ?? '—' }}</p>
                    <p class="opacity-75">{{ shift.shop_positions?.name ?? formatTime(shift.startTime) }}</p>
                  </li>
                </ul>
              </template>
            </div>
          </div>
        </div>
      </section>

    </template>
  </div>
</template>
