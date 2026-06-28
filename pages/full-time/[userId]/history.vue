<script setup lang="ts">
definePageMeta({ layout: 'staff' })

interface FinalShift {
  id: number; date: string; startTime: string; endTime: string
  positionId: number | null
  shop_positions: { name: string } | null
  shops: { name: string } | null
}

const route  = useRoute()
const userId = route.params.userId as string

const today = new Date()
const selectedYear  = ref(today.getFullYear())
const selectedMonth = ref(today.getMonth() + 1)

const currentMonth = computed(() =>
  `${selectedYear.value}-${String(selectedMonth.value).padStart(2, '0')}`,
)

function prevMonth() {
  if (selectedMonth.value === 1) { selectedYear.value--; selectedMonth.value = 12 }
  else selectedMonth.value--
}
function nextMonth() {
  if (selectedMonth.value === 12) { selectedYear.value++; selectedMonth.value = 1 }
  else selectedMonth.value++
}

const { data: shifts } = await useFetch<FinalShift[]>('/api/final-shifts', {
  query: { userId, month: currentMonth },
  default: () => [],
})

const workDays = computed(() => shifts.value.length)

function formatDate(iso: string) {
  const d = new Date(`${iso}T12:00:00+09:00`)
  return d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' })
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const min = (d.getUTCHours() * 60 + d.getUTCMinutes() + 540) % 1440
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}
</script>

<template>
  <div class="mx-auto max-w-xl p-6">

    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-lg font-bold text-slate-800">シフト履歴</h1>
      <div class="flex items-center gap-2">
        <button class="rounded border border-slate-300 px-2 py-1 text-xs text-slate-500 hover:bg-slate-100" @click="prevMonth">‹</button>
        <span class="text-sm font-semibold text-slate-700">{{ selectedYear }}年{{ selectedMonth }}月</span>
        <button class="rounded border border-slate-300 px-2 py-1 text-xs text-slate-500 hover:bg-slate-100" @click="nextMonth">›</button>
      </div>
    </div>

    <div class="mb-4 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
      <p class="text-xs text-slate-400">出勤日数</p>
      <p class="mt-0.5 text-2xl font-bold text-slate-800">{{ workDays }} <span class="text-sm font-normal text-slate-400">日</span></p>
    </div>

    <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
      <p v-if="shifts.length === 0" class="px-5 py-10 text-center text-sm text-slate-400">この月の確定シフトはありません</p>
      <ul v-else class="divide-y divide-slate-100">
        <li v-for="s in shifts" :key="s.id" class="flex items-center justify-between px-5 py-3">
          <div>
            <p class="text-sm font-medium text-slate-800">{{ formatDate(s.date) }}</p>
            <p class="mt-0.5 text-xs text-slate-500">終日出勤</p>
          </div>
          <span class="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">確定</span>
        </li>
      </ul>
    </section>

  </div>
</template>
