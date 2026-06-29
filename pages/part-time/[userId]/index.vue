<script setup lang="ts">
definePageMeta({ layout: 'staff' })

type ShiftStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
type DayStatus   = 'confirmed' | 'pending' | 'rejected'

interface CurrentUser {
  employmentType: string | null; primaryShopId: number | null
}
interface ShiftRequest {
  id: number; date: string; startTime: string; endTime: string
  status: ShiftStatus; note: string | null; shopId: number
}
interface FinalShift {
  id: number; date: string; startTime: string; endTime: string; shopId: number
  shops: { name: string } | null
}

const route = useRoute()
const routeUserId = route.params.userId as string

const { data: me } = await useFetch<CurrentUser | null>('/api/auth/me')

// 未ログイン or 本人以外はトップへ
if (!me.value || String(me.value.id) !== routeUserId) {
  await navigateTo('/', { replace: true })
}
// 社員はfull-timeへ
if (me.value && me.value.employmentType !== 'PART_TIME') {
  await navigateTo(`/full-time/${routeUserId}`, { replace: true })
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

// 店舗名マップ
const shopMap = computed(() => {
  const m = new Map<number, string>()
  allShops.value.forEach(s => m.set(s.id, s.name))
  return m
})

// 日別ステータス
const dayInfoMap = computed(() => {
  const map = new Map<string, { status: DayStatus; startTime: string; endTime: string; shopId: number | null }>()
  for (const f of myFinalShifts.value) map.set(f.date, { status: 'confirmed', startTime: f.startTime, endTime: f.endTime, shopId: f.shopId })
  for (const r of myRequests.value) {
    if (!map.has(r.date)) {
      map.set(r.date, {
        status: r.status === 'REJECTED' ? 'rejected' : 'pending',
        startTime: r.startTime,
        endTime: r.endTime,
        shopId: r.shopId,
      })
    }
  }
  return map
})

const STATUS_CONFIG = {
  confirmed: { dot: 'bg-emerald-400', label: '確定' },
  pending:   { dot: 'bg-amber-400',   label: '申請中' },
  rejected:  { dot: 'bg-rose-400',    label: '休み' },
}

const weekDayLabels = ['月', '火', '水', '木', '金', '土', '日']
const calendarCells = computed(() => {
  const [y, m] = currentMonth.value.split('-').map(Number)
  const firstDay = new Date(y, m - 1, 1)
  const lastDate = new Date(y, m, 0).getDate()
  const startOffset = (firstDay.getDay() + 6) % 7
  const cells: Array<{ day: number; dateStr: string; info: { status: DayStatus; startTime: string; endTime: string } | null; isToday: boolean } | null> = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= lastDate; d++) {
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, dateStr, info: dayInfoMap.value.get(dateStr) ?? null, isToday: dateStr === todayStr })
  }
  return cells
})

// モーダル
const selectedDate = ref<string | null>(null)
const showModal    = ref(false)
const submitting   = ref(false)
const formError    = ref('')

const selectedRequest = computed(() =>
  selectedDate.value ? myRequests.value.find(r => r.date === selectedDate.value) ?? null : null,
)
const selectedFinal = computed(() =>
  selectedDate.value ? myFinalShifts.value.find(f => f.date === selectedDate.value) ?? null : null,
)
const selectedDateLabel = computed(() => {
  if (!selectedDate.value) return ''
  return new Date(`${selectedDate.value}T12:00:00+09:00`).toLocaleDateString('ja-JP', {
    month: 'long', day: 'numeric', weekday: 'short',
  })
})

// --- 全店舗一覧 ---
const { data: allShops } = await useFetch<{ id: number; name: string }[]>('/api/shops', { default: () => [] })

function openModal(dateStr: string) {
  selectedDate.value = dateStr
  form.startTime = '09:00'
  form.endTime   = '17:00'
  form.shopId    = me.value?.primaryShopId ?? null
  formError.value = ''
  showModal.value = true
}
function closeModal() { showModal.value = false; selectedDate.value = null; formError.value = '' }

const form = reactive({ startTime: '09:00', endTime: '17:00', shopId: null as number | null })
const timeSlots = Array.from({ length: 29 }, (_, i) => {
  const min = 8 * 60 + i * 30
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
})
const endTimeSlots = computed(() => timeSlots.filter(t => t > form.startTime))
watch(() => form.startTime, v => {
  if (form.endTime <= v) {
    const idx = timeSlots.indexOf(v)
    form.endTime = timeSlots[Math.min(idx + 2, timeSlots.length - 1)]
  }
})

async function submitShift(start: string, end: string) {
  if (!selectedDate.value) return
  submitting.value = true; formError.value = ''
  try {
    await $fetch('/api/shift-requests', {
      method: 'POST',
      body: { userId, date: selectedDate.value, startTime: start, endTime: end, shopId: form.shopId },
    })
    await refreshRequests(); closeModal()
  } catch (e: unknown) {
    formError.value = (e as { statusMessage?: string })?.statusMessage ?? '提出に失敗しました'
  } finally { submitting.value = false }
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const min = (d.getUTCHours() * 60 + d.getUTCMinutes() + 540) % 1440
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await navigateTo('/')
}

// Realtime
const supabase = useSupabaseClient()
onMounted(() => {
  const channel = supabase.channel(`pt-${userId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'final_shifts' }, async () => { await refreshFinalShifts() })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'final_shifts' }, async () => { await refreshFinalShifts() })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'shift_requests' }, async () => { await refreshRequests() })
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
            <p class="mt-0.5 text-sm text-slate-500">{{ me.name }} さん ／ <span class="font-medium">アルバイト</span></p>
          </div>
          <button class="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100" @click="logout">ログアウト</button>
        </header>

        <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div class="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <button class="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100" @click="prevMonth">‹ 前月</button>
            <span class="text-sm font-semibold text-slate-700">{{ monthLabel }}</span>
            <button class="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100" @click="nextMonth">翌月 ›</button>
          </div>

          <div class="flex flex-wrap gap-x-4 gap-y-1 px-5 py-2 text-xs text-slate-500">
            <span v-for="(cfg, key) in STATUS_CONFIG" :key="key" class="flex items-center gap-1">
              <span class="inline-block h-2.5 w-2.5 rounded-full" :class="cfg.dot" />{{ cfg.label }}
            </span>
            <span class="flex items-center gap-1"><span class="inline-block h-2.5 w-2.5 rounded-full bg-slate-200" />未提出</span>
          </div>

          <div class="px-4 pb-4">
            <div class="grid grid-cols-7">
              <div
                v-for="(label, i) in weekDayLabels" :key="label"
                class="py-1.5 text-center text-xs font-semibold"
                :class="i === 5 ? 'text-blue-500' : i === 6 ? 'text-rose-500' : 'text-slate-400'"
              >{{ label }}</div>
            </div>
            <div class="grid grid-cols-7 gap-1">
              <div v-for="(cell, i) in calendarCells" :key="i" class="aspect-square">
                <div v-if="!cell" />
                <button
                  v-else
                  class="flex h-full w-full flex-col items-center justify-center rounded-lg text-xs font-medium transition"
                  :class="[
                    cell.isToday ? 'ring-2 ring-brand ring-offset-1' : '',
                    cell.info?.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700'
                    : cell.info?.status === 'pending'  ? 'bg-amber-50 text-amber-700'
                    : cell.info?.status === 'rejected' ? 'bg-rose-50 text-rose-700'
                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                  ]"
                  @click="openModal(cell.dateStr)"
                >
                  <span class="text-sm font-semibold leading-none">{{ cell.day }}</span>
                  <!-- 休み（rejected）は時間を非表示、その他は時間を表示 -->
                  <template v-if="cell.info && cell.info.status !== 'rejected'">
                    <span class="mt-0.5 leading-none opacity-80" style="font-size:9px">{{ formatTime(cell.info.startTime) }}</span>
                    <span class="leading-none opacity-80" style="font-size:9px">〜{{ formatTime(cell.info.endTime) }}</span>
                    <!-- 他店舗の場合は店舗名を表示 -->
                    <span
                      v-if="cell.info.shopId && cell.info.shopId !== me?.primaryShopId"
                      class="mt-0.5 leading-none font-bold text-purple-600"
                      style="font-size:8px"
                    >{{ shopMap.get(cell.info.shopId) ?? '他店' }}</span>
                  </template>
                  <template v-else-if="cell.info?.status === 'rejected'">
                    <span class="mt-0.5 leading-none opacity-80" style="font-size:9px">休み</span>
                  </template>
                </button>
              </div>
            </div>
          </div>
        </section>
      </template>
    </div>

    <!-- モーダル -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="closeModal">
        <div class="w-full max-w-sm rounded-xl bg-white shadow-xl">
          <div class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 class="font-semibold text-slate-800">{{ selectedDateLabel }}</h3>
            <button class="text-slate-400 hover:text-slate-600" @click="closeModal">✕</button>
          </div>
          <div class="px-5 py-5">
            <!-- 確定済み -->
            <template v-if="selectedFinal">
              <div class="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <p class="font-semibold">確定済みです</p>
                <p>{{ formatTime(selectedFinal.startTime) }}〜{{ formatTime(selectedFinal.endTime) }}</p>
              </div>
            </template>
            <!-- 提出済み -->
            <template v-else-if="selectedRequest">
              <div class="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
                <p class="font-semibold">申請中</p>
                <p>{{ formatTime(selectedRequest.startTime) }}〜{{ formatTime(selectedRequest.endTime) }}</p>
              </div>
            </template>
            <!-- 未提出 -->
            <template v-else>
              <p class="mb-3 text-sm text-slate-500">勤務時間を選択してください</p>
              <!-- 店舗選択 -->
              <label class="mb-3 block">
                <span class="mb-1 block text-xs font-medium text-slate-600">出勤店舗</span>
                <select
                  v-model="form.shopId"
                  class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                >
                  <option v-for="shop in allShops" :key="shop.id" :value="shop.id">
                    {{ shop.name }}{{ shop.id === me?.primaryShopId ? '（メイン）' : '' }}
                  </option>
                </select>
              </label>
              <div class="mb-4 grid grid-cols-2 gap-3">
                <label class="block">
                  <span class="mb-1 block text-xs font-medium text-slate-600">開始時間</span>
                  <select v-model="form.startTime" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none">
                    <option v-for="t in timeSlots.slice(0, -1)" :key="t" :value="t">{{ t }}</option>
                  </select>
                </label>
                <label class="block">
                  <span class="mb-1 block text-xs font-medium text-slate-600">終了時間</span>
                  <select v-model="form.endTime" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none">
                    <option v-for="t in endTimeSlots" :key="t" :value="t">{{ t }}</option>
                  </select>
                </label>
              </div>
              <p v-if="formError" class="mb-2 text-xs text-rose-600">{{ formError }}</p>
              <button
                class="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
                :disabled="submitting"
                @click="submitShift(form.startTime, form.endTime)"
              >{{ submitting ? '提出中…' : '希望を提出する' }}</button>
            </template>
          </div>
        </div>
      </div>
    </Teleport>
  </main>
</template>
