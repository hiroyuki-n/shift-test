<script setup lang="ts">
interface CurrentUser {
  id: number; name: string; role: string
  employmentType: string | null; primaryShopId: number | null
}
interface ShiftRequest {
  id: number; date: string; startTime: string; endTime: string; status: string; shopId: number
}
interface FinalShift {
  id: number; date: string; startTime: string; endTime: string; shopId: number
}

const { data: me } = await useFetch<CurrentUser | null>('/api/auth/me')
const userId = computed(() => me.value?.id ?? '')

// 社員以外はリダイレクト
if (me.value && me.value.employmentType !== 'FULL_TIME') {
  await navigateTo('/part-time', { replace: true })
}

const today = new Date()
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
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

const { data: myRequests, refresh: refreshRequests } = await useFetch<ShiftRequest[]>(
  '/api/shift-requests',
  { query: { userId, month: currentMonth }, default: () => [] },
)
const { data: myFinalShifts, refresh: refreshFinalShifts } = await useFetch<FinalShift[]>(
  '/api/final-shifts',
  { query: { userId, month: currentMonth }, default: () => [] },
)

// 日別状態マップ
const dayStatusMap = computed(() => {
  const map = new Map<string, 'confirmed' | 'pending' | 'absent'>()
  for (const f of myFinalShifts.value) map.set(f.date, 'confirmed')
  for (const r of myRequests.value) {
    if (!map.has(r.date)) {
      map.set(r.date, r.status === 'REJECTED' ? 'absent' : 'pending')
    }
  }
  return map
})

const weekDayLabels = ['月', '火', '水', '木', '金', '土', '日']
const calendarCells = computed(() => {
  const [y, m] = currentMonth.value.split('-').map(Number)
  const firstDay = new Date(y, m - 1, 1)
  const lastDate = new Date(y, m, 0).getDate()
  const startOffset = (firstDay.getDay() + 6) % 7
  const cells: Array<{ day: number; dateStr: string; status: string | null; isToday: boolean } | null> = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= lastDate; d++) {
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, dateStr, status: dayStatusMap.value.get(dateStr) ?? null, isToday: dateStr === todayStr })
  }
  return cells
})

// 出勤提出
const submitting = ref<string | null>(null)

async function submitAttendance(dateStr: string) {
  if (!userId.value) return
  submitting.value = dateStr
  try {
    await $fetch('/api/shift-requests', {
      method: 'POST',
      body: { userId: userId.value, date: dateStr, startTime: '09:00', endTime: '18:00' },
    })
    await refreshRequests()
  } finally { submitting.value = null }
}

// 欠勤（提出済みを削除）
async function markAbsent(dateStr: string) {
  const req = myRequests.value.find(r => r.date === dateStr)
  if (!req) return
  submitting.value = dateStr
  try {
    await $fetch(`/api/shift-requests/${req.id}`, { method: 'PATCH', body: { status: 'REJECTED' } })
    await refreshRequests()
  } finally { submitting.value = null }
}

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await navigateTo('/')
}

// Realtime
const supabase = useSupabaseClient()
onMounted(() => {
  if (!userId.value) return
  const channel = supabase.channel(`ft-${userId.value}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'final_shifts' }, async () => { await refreshFinalShifts() })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'final_shifts' }, async () => { await refreshFinalShifts() })
    .subscribe()
  onUnmounted(() => supabase.removeChannel(channel))
})
</script>

<template>
  <main class="min-h-screen bg-slate-50 p-4 sm:p-6">
    <div class="mx-auto max-w-2xl">

      <div v-if="!me" class="mt-12 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 class="text-xl font-bold text-slate-800">ログインが必要です</h1>
        <NuxtLink to="/" class="mt-4 inline-block text-sm font-medium text-brand hover:underline">トップへ戻る</NuxtLink>
      </div>

      <template v-else>
        <header class="mb-6 flex items-end justify-between">
          <div>
            <h1 class="text-2xl font-bold text-slate-800">マイシフト</h1>
            <p class="mt-0.5 text-sm text-slate-500">{{ me.name }} さん ／ <span class="font-medium">社員</span></p>
          </div>
          <button class="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100" @click="logout">ログアウト</button>
        </header>

        <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
          <!-- 月ナビ -->
          <div class="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <button class="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100" @click="prevMonth">‹ 前月</button>
            <span class="text-sm font-semibold text-slate-700">{{ monthLabel }}</span>
            <button class="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100" @click="nextMonth">翌月 ›</button>
          </div>

          <!-- 凡例 -->
          <div class="flex gap-4 px-5 py-2 text-xs text-slate-500">
            <span class="flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-full bg-emerald-400" />確定</span>
            <span class="flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-full bg-amber-400" />申請中</span>
            <span class="flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-full bg-slate-200" />未提出</span>
          </div>

          <!-- カレンダー -->
          <div class="px-4 pb-4">
            <div class="grid grid-cols-7">
              <div
                v-for="(label, i) in weekDayLabels" :key="label"
                class="py-1.5 text-center text-xs font-semibold"
                :class="i === 5 ? 'text-blue-500' : i === 6 ? 'text-rose-500' : 'text-slate-400'"
              >{{ label }}</div>
            </div>
            <div class="grid grid-cols-7 gap-1">
              <div v-for="(cell, i) in calendarCells" :key="i">
                <div v-if="!cell" class="h-20" />
                <div
                  v-else
                  class="h-20 rounded-lg border p-1.5 flex flex-col"
                  :class="[
                    cell.isToday ? 'border-brand' : 'border-slate-100',
                    cell.status === 'confirmed' ? 'bg-emerald-50'
                    : cell.status === 'pending'   ? 'bg-amber-50'
                    : 'bg-white'
                  ]"
                >
                  <p class="mb-1 text-right text-xs font-semibold" :class="cell.isToday ? 'text-brand' : 'text-slate-500'">{{ cell.day }}</p>

                  <!-- 確定済み -->
                  <div v-if="cell.status === 'confirmed'" class="flex flex-1 items-center justify-center">
                    <span class="rounded-full bg-emerald-400 px-2 py-0.5 text-xs font-bold text-white">確定</span>
                  </div>

                  <!-- 申請中 -->
                  <div v-else-if="cell.status === 'pending'" class="flex flex-1 flex-col items-center justify-center gap-1">
                    <span class="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-white">申請中</span>
                    <button
                      class="text-xs text-slate-400 hover:text-rose-500 transition"
                      :disabled="submitting === cell.dateStr"
                      @click="markAbsent(cell.dateStr)"
                    >取消</button>
                  </div>

                  <!-- 未提出 -->
                  <div v-else class="flex flex-1 gap-1">
                    <button
                      class="flex-1 rounded text-xs font-semibold transition bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50"
                      :disabled="submitting === cell.dateStr"
                      @click="submitAttendance(cell.dateStr)"
                    >出勤</button>
                    <button
                      class="flex-1 rounded text-xs font-semibold transition bg-slate-100 text-slate-500 hover:bg-slate-200"
                      disabled
                    >欠勤</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </template>
    </div>
  </main>
</template>
