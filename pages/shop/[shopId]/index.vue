<script setup lang="ts">
type EmploymentType = 'PART_TIME' | 'FULL_TIME'
type Position       = 'HALL' | 'KITCHEN' | 'CASHIER' | 'MANAGER' | 'OTHER'
type ShiftStatus    = 'PENDING' | 'APPROVED' | 'REJECTED'

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

interface FinalShift {
  id: number
  date: string
  startTime: string
  endTime: string
  position: Position
  userId: number
  shopId: number
  users: { name: string } | null
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

const route  = useRoute()
const shopId = computed(() => route.params.shopId as string)

const today = new Date()
const currentMonth = ref(
  `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
)

const { data, pending, error } = await useFetch<ShopDetail>(
  () => `/api/shops/${shopId.value}`,
)

const { data: shifts } = await useFetch<FinalShift[]>('/api/final-shifts', {
  query: { shopId, month: currentMonth },
  default: () => [],
})

const { data: requests, refresh: refreshRequests } = await useFetch<ShiftRequest[]>('/api/shift-requests', {
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

// --- ポジション ---
const positionLabel: Record<Position, string> = {
  HALL: 'ホール', KITCHEN: 'キッチン', CASHIER: 'レジ', MANAGER: '管理', OTHER: 'その他',
}
const positionColor: Record<Position, string> = {
  HALL:    'bg-blue-100 text-blue-700',
  KITCHEN: 'bg-orange-100 text-orange-700',
  CASHIER: 'bg-emerald-100 text-emerald-700',
  MANAGER: 'bg-purple-100 text-purple-700',
  OTHER:   'bg-slate-100 text-slate-600',
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

// --- 日別の確定・未確定集計（2パターン） ---
interface DayStats { confirmed: number; unconfirmed: number }

const dayStatsMap = computed(() => {
  const map = new Map<string, DayStats>()
  const get = (d: string) => map.get(d) ?? { confirmed: 0, unconfirmed: 0 }
  for (const s of shifts.value) {
    const e = get(s.date); e.confirmed++; map.set(s.date, e)
  }
  for (const r of requests.value) {
    if (r.status === 'PENDING' || r.status === 'APPROVED') {
      const e = get(r.date); e.unconfirmed++; map.set(r.date, e)
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
      stats:   dayStatsMap.value.get(dateStr) ?? { confirmed: 0, unconfirmed: 0 },
      isToday: dateStr === todayStr,
    })
  }
  return cells
})

function statusCellClass(stats: DayStats, isToday: boolean) {
  if (isToday) return 'ring-2 ring-brand ring-offset-1 bg-white'
  if (stats.confirmed > 0 && stats.unconfirmed === 0) return 'bg-emerald-50'
  if (stats.unconfirmed > 0 && stats.confirmed === 0) return 'bg-amber-50'
  if (stats.confirmed > 0 && stats.unconfirmed > 0)   return 'bg-white'
  return 'bg-white'
}

// --- 希望シフト管理 ---
const STATUS_CONFIG: Record<ShiftStatus, { label: string; badge: string }> = {
  PENDING:  { label: '保留',   badge: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: '入れる', badge: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: '外す',   badge: 'bg-rose-100 text-rose-700' },
}

const statusFilter  = ref<ShiftStatus | 'ALL'>('ALL')
const pendingCount  = computed(() => requests.value.filter(r => r.status === 'PENDING').length)
const updatingId    = ref<number | null>(null)

const filteredRequests = computed(() => {
  const list = statusFilter.value === 'ALL'
    ? [...requests.value]
    : requests.value.filter(r => r.status === statusFilter.value)

  return list.sort((a, b) =>
    a.date !== b.date
      ? a.date.localeCompare(b.date)
      : a.startTime.localeCompare(b.startTime),
  )
})

async function updateStatus(id: number, status: ShiftStatus) {
  updatingId.value = id
  try {
    await $fetch(`/api/shift-requests/${id}`, { method: 'PATCH', body: { status } })
    await refreshRequests()
  } finally {
    updatingId.value = null
  }
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

      <!-- 月ナビゲーション（共通） -->
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
              <span class="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />確定
            </span>
            <span class="flex items-center gap-1.5">
              <span class="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />未確定
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
              <NuxtLink
                v-if="cell"
                :to="`/shop/${shopId}/${cell.dateStr}`"
                class="flex h-10 w-full flex-col items-center justify-center rounded-md border transition hover:opacity-75"
                :class="[statusCellClass(cell.stats, cell.isToday), cell.isToday ? 'border-brand' : 'border-slate-100']"
              >
                <span class="text-xs font-medium leading-none" :class="cell.isToday ? 'text-brand' : 'text-slate-600'">
                  {{ cell.day }}
                </span>
                <div class="mt-0.5 flex gap-0.5">
                  <span v-if="cell.stats.confirmed > 0"   class="h-1 w-1 rounded-full bg-emerald-400" />
                  <span v-if="cell.stats.unconfirmed > 0" class="h-1 w-1 rounded-full bg-amber-400" />
                </div>
              </NuxtLink>
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
                <NuxtLink
                  :to="`/shop/${shopId}/${cell.dateStr}`"
                  class="mb-1 block text-right text-xs font-semibold hover:underline"
                  :class="cell.dateStr === todayStr ? 'text-brand' : 'text-slate-500'"
                >{{ cell.day }}</NuxtLink>
                <ul class="space-y-0.5">
                  <li
                    v-for="shift in cell.shifts" :key="shift.id"
                    class="rounded px-1 py-0.5 text-xs leading-tight"
                    :class="positionColor[shift.position]"
                  >
                    <p class="font-medium">{{ shift.users?.name ?? '—' }}</p>
                    <p class="opacity-75">{{ formatTime(shift.startTime) }}〜{{ formatTime(shift.endTime) }}</p>
                  </li>
                </ul>
              </template>
            </div>
          </div>
        </div>
        <div class="flex flex-wrap gap-2 border-t border-slate-100 px-6 py-3">
          <span
            v-for="(label, pos) in positionLabel" :key="pos"
            class="rounded-full px-2.5 py-0.5 text-xs font-medium"
            :class="positionColor[pos as Position]"
          >{{ label }}</span>
        </div>
      </section>

      <!-- 希望シフト管理 -->
      <section class="mb-8 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div class="flex items-center gap-3">
            <h2 class="text-lg font-semibold text-slate-800">希望シフト</h2>
            <span v-if="pendingCount > 0" class="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
              未処理 {{ pendingCount }}件
            </span>
          </div>
        </div>
        <div class="flex gap-1 border-b border-slate-100 px-6 py-2">
          <button
            v-for="(label, key) in { ALL: '全て', PENDING: '申請中', APPROVED: '承認済み', REJECTED: '却下' }"
            :key="key"
            class="rounded-full px-3 py-1 text-xs font-medium transition"
            :class="statusFilter === key ? 'bg-brand text-white' : 'text-slate-500 hover:bg-slate-100'"
            @click="statusFilter = key as typeof statusFilter"
          >
            {{ label }}
            <span v-if="key !== 'ALL'" class="ml-1 opacity-70">({{ requests.filter(r => r.status === key).length }})</span>
          </button>
        </div>

        <div v-if="filteredRequests.length === 0" class="px-6 py-10 text-center text-sm text-slate-400">
          該当する希望シフトはありません
        </div>
        <table v-else class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th class="px-6 py-3">スタッフ</th>
              <th class="px-6 py-3">日付</th>
              <th class="px-6 py-3">希望時間</th>
              <th class="px-6 py-3">ステータス</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="req in filteredRequests" :key="req.id" class="hover:bg-slate-50">
              <td class="px-6 py-3">
                <p class="font-medium text-slate-800">{{ req.users?.name ?? '—' }}</p>
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="req.users?.employmentType === 'FULL_TIME' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'"
                >{{ req.users?.employmentType === 'FULL_TIME' ? '社員' : 'アルバイト' }}</span>
              </td>
              <td class="px-6 py-3 text-slate-700">{{ req.date }}</td>
              <td class="px-6 py-3 text-slate-700">{{ formatTime(req.startTime) }}〜{{ formatTime(req.endTime) }}</td>
              <td class="px-6 py-3">
                <div class="flex gap-1">
                  <button
                    v-for="(cfg, key) in STATUS_CONFIG" :key="key"
                    class="rounded-full px-2.5 py-0.5 text-xs font-semibold transition"
                    :class="req.status === key ? cfg.badge : 'bg-slate-100 text-slate-300 hover:text-slate-500'"
                    :disabled="updatingId === req.id"
                    @click="updateStatus(req.id, key as ShiftStatus)"
                  >{{ cfg.label }}</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

    </template>
  </div>
</template>
