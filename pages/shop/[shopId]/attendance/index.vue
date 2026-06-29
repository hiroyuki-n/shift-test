<script setup lang="ts">
definePageMeta({ layout: 'shop' })
useHead({ title: '勤怠記録' })

const route  = useRoute()
const shopId = route.params.shopId as string

const today = new Date()
const currentMonth = ref(
  `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
)

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

// 月の確定シフト一覧
const { data: finalShifts } = await useFetch<{ date: string }[]>('/api/final-shifts', {
  query: { shopId, month: currentMonth },
  default: () => [],
})

// 月の勤怠記録一覧
const { data: records } = await useFetch<{ date: string }[]>('/api/attendance-records', {
  query: { shopId, month: currentMonth },
  default: () => [],
})

// 日付ごとの件数を集計
const shiftCountByDate = computed(() => {
  const map: Record<string, number> = {}
  finalShifts.value.forEach(s => { map[s.date] = (map[s.date] ?? 0) + 1 })
  return map
})
const recordCountByDate = computed(() => {
  const map: Record<string, number> = {}
  records.value.forEach(r => { map[r.date] = (map[r.date] ?? 0) + 1 })
  return map
})

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

// カレンダーグリッド生成
const calendarDays = computed(() => {
  const [y, m] = currentMonth.value.split('-').map(Number)
  const firstWeekday = new Date(y, m - 1, 1).getDay()
  const lastDate     = new Date(y, m, 0).getDate()

  type DayCell = {
    d: number; dateStr: string; dayOfWeek: number
    isToday: boolean; shiftCount: number; recordCount: number
  } | null

  const cells: DayCell[] = Array(firstWeekday).fill(null)
  for (let d = 1; d <= lastDate; d++) {
    const dateStr    = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dayOfWeek  = new Date(y, m - 1, d).getDay()
    const shiftCount  = shiftCountByDate.value[dateStr]  ?? 0
    const recordCount = recordCountByDate.value[dateStr] ?? 0
    cells.push({ d, dateStr, dayOfWeek, isToday: dateStr === todayStr, shiftCount, recordCount })
  }
  // 7の倍数になるよう末尾を埋める
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
})

// ステータス判定
function status(shiftCount: number, recordCount: number): 'done' | 'partial' | 'missing' | 'none' {
  if (shiftCount === 0)                   return 'none'
  if (recordCount === 0)                  return 'missing'
  if (recordCount < shiftCount)           return 'partial'
  return 'done'
}

const STATUS_STYLE = {
  done:    { dot: 'bg-emerald-400', badge: 'bg-emerald-50  text-emerald-700', label: '完了'   },
  partial: { dot: 'bg-amber-400',   badge: 'bg-amber-50    text-amber-700',   label: '一部'   },
  missing: { dot: 'bg-rose-400',    badge: 'bg-rose-50     text-rose-600',    label: '未記録' },
  none:    { dot: '',               badge: '',                                label: ''       },
}
</script>

<template>
  <div class="mx-auto max-w-3xl p-6 lg:p-8">
    <!-- ヘッダー -->
    <header class="mb-6">
      <h1 class="text-2xl font-bold text-slate-800">勤怠記録</h1>
    </header>

    <!-- 凡例 -->
    <div class="mb-4 flex flex-wrap gap-3 text-xs text-slate-500">
      <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>完了</span>
      <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-amber-400"></span>一部記録</span>
      <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-rose-400"></span>未記録</span>
    </div>

    <!-- カレンダー -->
    <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
      <!-- 月ナビ -->
      <div class="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <button class="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100" @click="prevMonth">‹ 前月</button>
        <span class="text-sm font-semibold text-slate-700">{{ monthLabel }}</span>
        <button class="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100" @click="nextMonth">翌月 ›</button>
      </div>

      <!-- 曜日ヘッダー -->
      <div class="grid grid-cols-7 border-b border-slate-100">
        <div
          v-for="(label, i) in DAY_LABELS"
          :key="label"
          class="py-2 text-center text-xs font-medium"
          :class="i === 0 ? 'text-rose-400' : i === 6 ? 'text-blue-400' : 'text-slate-400'"
        >{{ label }}</div>
      </div>

      <!-- 日付グリッド -->
      <div class="grid grid-cols-7">
        <div
          v-for="(cell, idx) in calendarDays"
          :key="idx"
          class="min-h-[72px] border-b border-r border-slate-100 last:border-r-0 [&:nth-child(7n)]:border-r-0"
        >
          <!-- 空セル -->
          <template v-if="!cell" />

          <!-- 日付セル -->
          <NuxtLink
            v-else
            :to="cell.shiftCount > 0 ? `/shop/${shopId}/attendance/${cell.dateStr}` : undefined"
            class="flex h-full flex-col p-2 transition-colors"
            :class="[
              cell.shiftCount > 0 ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default',
              cell.isToday ? 'bg-brand/5' : '',
            ]"
          >
            <!-- 日付番号 -->
            <div class="flex items-center justify-between">
              <span
                class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold"
                :class="[
                  cell.isToday        ? 'bg-brand text-white'
                  : cell.dayOfWeek === 0 ? 'text-rose-500'
                  : cell.dayOfWeek === 6 ? 'text-blue-500'
                  : 'text-slate-700'
                ]"
              >{{ cell.d }}</span>
              <span
                v-if="status(cell.shiftCount, cell.recordCount) !== 'none'"
                class="h-2.5 w-2.5 rounded-full"
                :class="STATUS_STYLE[status(cell.shiftCount, cell.recordCount)].dot"
              />
            </div>

            <!-- バッジ -->
            <div v-if="cell.shiftCount > 0" class="mt-1.5 space-y-0.5">
              <span
                class="block rounded px-1 py-0.5 text-center text-xs font-medium"
                :class="STATUS_STYLE[status(cell.shiftCount, cell.recordCount)].badge"
              >{{ STATUS_STYLE[status(cell.shiftCount, cell.recordCount)].label }}</span>
              <span class="block text-center text-xs text-slate-400">
                {{ cell.recordCount }}/{{ cell.shiftCount }}人
              </span>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>
