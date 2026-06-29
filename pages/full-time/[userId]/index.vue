<script setup lang="ts">
definePageMeta({ layout: 'staff' })

interface CurrentUser {
  id: number; employmentType: string | null; primaryShopId: number | null; name: string
}
interface ShiftRequest {
  id: number; date: string; startTime: string; endTime: string; status: string; shopId: number
}
interface FinalShift {
  id: number; date: string; startTime: string; endTime: string; shopId: number
}

const route       = useRoute()
const routeUserId = route.params.userId as string

const { data: me } = await useFetch<CurrentUser | null>('/api/auth/me')

if (!me.value || String(me.value.id) !== routeUserId) {
  await navigateTo('/', { replace: true })
}
if (me.value && me.value.employmentType !== 'FULL_TIME') {
  await navigateTo(`/part-time/${routeUserId}`, { replace: true })
}

const userId = routeUserId

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

// 月の全日リスト生成
const dayList = computed(() => {
  const [y, m] = currentMonth.value.split('-').map(Number)
  const lastDate = new Date(y, m, 0).getDate()
  return Array.from({ length: lastDate }, (_, i) => {
    const d = i + 1
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const date    = new Date(y, m - 1, d)
    const dayOfWeek = date.getDay() // 0=日, 6=土
    const req   = myRequests.value.find(r => r.date === dateStr)
    const final = myFinalShifts.value.find(f => f.date === dateStr)
    const status = final ? 'confirmed' : req ? (req.status === 'REJECTED' ? 'absent' : 'pending') : null
    return { d, dateStr, dayOfWeek, isToday: dateStr === todayStr, status, reqId: req?.id ?? null }
  })
})

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

// 出勤提出
const submitting = ref(new Set<string>())

function isSubmitting(dateStr: string) { return submitting.value.has(dateStr) }

async function submitAttendance(dateStr: string) {
  if (isSubmitting(dateStr)) return
  submitting.value.add(dateStr)
  submitting.value = new Set(submitting.value)
  try {
    await $fetch('/api/shift-requests', {
      method: 'POST',
      body: { userId, date: dateStr, startTime: '09:00', endTime: '18:00' },
    })
    await refreshRequests()
  } finally {
    submitting.value.delete(dateStr)
    submitting.value = new Set(submitting.value)
  }
}

async function markAbsent(dateStr: string, reqId: number | null) {
  if (isSubmitting(dateStr)) return
  submitting.value.add(dateStr)
  submitting.value = new Set(submitting.value)
  try {
    if (reqId) {
      // 既存リクエストをREJECTEDに変更
      await $fetch(`/api/shift-requests/${reqId}`, { method: 'PATCH', body: { status: 'REJECTED' } })
    } else {
      // 未提出 → 休みリクエストを新規作成してREJECTEDに設定
      const { id } = await $fetch<{ id: number }>('/api/shift-requests', {
        method: 'POST',
        body: { userId, date: dateStr, startTime: '09:00', endTime: '18:00' },
      })
      await $fetch(`/api/shift-requests/${id}`, { method: 'PATCH', body: { status: 'REJECTED' } })
    }
    await refreshRequests()
  } finally {
    submitting.value.delete(dateStr)
    submitting.value = new Set(submitting.value)
  }
}

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await navigateTo('/')
}

// Realtime
const supabase = useSupabaseClient()
onMounted(() => {
  const channel = supabase.channel(`ft-${userId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'final_shifts' }, async () => { await refreshFinalShifts() })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'final_shifts' }, async () => { await refreshFinalShifts() })
    .subscribe()
  onUnmounted(() => supabase.removeChannel(channel))
})
</script>

<template>
  <main class="min-h-screen bg-slate-50 p-4 sm:p-6">
    <div class="mx-auto max-w-xl">

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

        <!-- 月ナビ -->
        <div class="mb-4 flex items-center justify-between">
          <button class="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100" @click="prevMonth">‹ 前月</button>
          <span class="text-sm font-semibold text-slate-700">{{ monthLabel }}</span>
          <button class="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100" @click="nextMonth">翌月 ›</button>
        </div>

        <!-- 日別リスト -->
        <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
          <ul class="divide-y divide-slate-100">
            <li
              v-for="day in dayList"
              :key="day.dateStr"
              class="flex items-center gap-3 px-4 py-2.5"
              :class="[
                day.dayOfWeek === 0 ? 'bg-rose-50/50' : day.dayOfWeek === 6 ? 'bg-blue-50/50' : '',
                day.isToday ? 'bg-brand/5' : '',
              ]"
            >
              <!-- 日付・曜日 -->
              <div class="w-14 shrink-0 flex items-center gap-1">
                <span
                  class="text-sm font-semibold"
                  :class="[
                    day.isToday        ? 'text-brand'
                    : day.dayOfWeek === 0 ? 'text-rose-500'
                    : day.dayOfWeek === 6 ? 'text-blue-500'
                    : 'text-slate-700'
                  ]"
                >{{ day.d }}</span>
                <span
                  class="text-xs"
                  :class="[
                    day.dayOfWeek === 0 ? 'text-rose-400'
                    : day.dayOfWeek === 6 ? 'text-blue-400'
                    : 'text-slate-400'
                  ]"
                >{{ DAY_LABELS[day.dayOfWeek] }}</span>
              </div>

              <!-- ステータス / ボタン -->
              <div class="flex flex-1 items-center justify-end gap-1.5">

                <!-- 確定 -->
                <span v-if="day.status === 'confirmed'" class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">確定</span>

                <!-- 出勤・休みボタン（確定以外は常に表示） -->
                <template v-else>
                  <button
                    class="rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50"
                    :class="day.status === 'pending'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-400 hover:text-slate-600'"
                    :disabled="isSubmitting(day.dateStr) || day.status === 'pending'"
                    @click="submitAttendance(day.dateStr)"
                  >出勤</button>
                  <button
                    class="rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50"
                    :class="day.status === 'absent'
                      ? 'bg-rose-100 text-rose-600'
                      : 'bg-slate-100 text-slate-400 hover:text-slate-600'"
                    :disabled="isSubmitting(day.dateStr) || day.status === 'absent'"
                    @click="markAbsent(day.dateStr, day.reqId)"
                  >休み</button>
                </template>

              </div>
            </li>
          </ul>
        </section>

      </template>
    </div>
  </main>
</template>
