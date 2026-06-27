<script setup lang="ts">
type ShiftStatus    = 'PENDING' | 'APPROVED' | 'REJECTED'
type EmploymentType = 'PART_TIME' | 'FULL_TIME' | null
type DayStatus      = 'confirmed' | 'pending' | 'approved' | 'rejected'

interface CurrentUser {
  id: number; name: string; role: string
  employmentType: EmploymentType; primaryShopId: number | null
}
interface ShiftRequest {
  id: number; date: string; startTime: string; endTime: string
  status: ShiftStatus; note: string | null; shopId: number
}
interface FinalShift {
  id: number; date: string; startTime: string; endTime: string
  position: string; shopId: number; shops: { name: string } | null
}

// --- 認証 ---
const { data: me } = await useFetch<CurrentUser | null>('/api/auth/me')
const userId = computed(() => me.value?.id ?? '')

// --- 月管理 ---
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

// --- データ取得 ---
const { data: myRequests, refresh: refreshRequests } = await useFetch<ShiftRequest[]>(
  '/api/shift-requests',
  { query: { userId, month: currentMonth }, default: () => [] },
)
const { data: myFinalShifts } = await useFetch<FinalShift[]>(
  '/api/final-shifts',
  { query: { userId, month: currentMonth }, default: () => [] },
)

// --- 日別ステータスマップ ---
// staff 側では approved は pending と同じ「申請中」として扱う
const dayStatusMap = computed(() => {
  const map = new Map<string, DayStatus>()
  for (const f of myFinalShifts.value) map.set(f.date, 'confirmed')
  for (const r of myRequests.value) {
    if (!map.has(r.date)) {
      map.set(r.date, r.status === 'REJECTED' ? 'rejected' : 'pending')
    }
  }
  return map
})

// --- カレンダー生成 ---
const weekDayLabels = ['月', '火', '水', '木', '金', '土', '日']
const calendarCells = computed(() => {
  const [y, m] = currentMonth.value.split('-').map(Number)
  const firstDay = new Date(y, m - 1, 1)
  const lastDate = new Date(y, m, 0).getDate()
  const startOffset = (firstDay.getDay() + 6) % 7
  const cells: Array<{ day: number; dateStr: string; status: DayStatus | null; isToday: boolean } | null> = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= lastDate; d++) {
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, dateStr, status: dayStatusMap.value.get(dateStr) ?? null, isToday: dateStr === todayStr })
  }
  return cells
})

// --- ステータス表示設定（staff 側は 3種類のみ） ---
const STATUS_CONFIG: Record<string, { dot: string; badge: string; label: string }> = {
  confirmed: { dot: 'bg-emerald-400', badge: 'bg-emerald-100 text-emerald-700', label: '確定' },
  pending:   { dot: 'bg-amber-400',   badge: 'bg-amber-100 text-amber-700',     label: '申請中' },
  rejected:  { dot: 'bg-rose-400',    badge: 'bg-rose-100 text-rose-700',       label: '却下' },
}

// リスト表示用：PENDING・APPROVED → 申請中 / REJECTED → 却下
function requestStatusCfg(status: ShiftStatus) {
  return status === 'REJECTED'
    ? STATUS_CONFIG.rejected
    : STATUS_CONFIG.pending
}

// --- モーダル ---
const selectedDate   = ref<string | null>(null)
const showModal      = ref(false)
const submitting     = ref(false)
const formError      = ref('')

const selectedRequest = computed(() =>
  selectedDate.value ? myRequests.value.find(r => r.date === selectedDate.value) ?? null : null
)
const selectedFinal = computed(() =>
  selectedDate.value ? myFinalShifts.value.find(f => f.date === selectedDate.value) ?? null : null
)
const selectedDateLabel = computed(() => {
  if (!selectedDate.value) return ''
  return new Date(`${selectedDate.value}T12:00:00+09:00`).toLocaleDateString('ja-JP', {
    month: 'long', day: 'numeric', weekday: 'short',
  })
})

function openModal(dateStr: string) {
  selectedDate.value = dateStr
  form.startTime = '09:00'
  form.endTime = '17:00'
  formError.value = ''
  showModal.value = true
}
function closeModal() {
  showModal.value = false
  selectedDate.value = null
  formError.value = ''
}

// --- フォーム（アルバイト用 時間選択） ---
const form = reactive({ startTime: '09:00', endTime: '17:00' })

const timeSlots = Array.from({ length: 29 }, (_, i) => {
  const min = 8 * 60 + i * 30
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
})
const endTimeSlots = computed(() => timeSlots.filter(t => t > form.startTime))

watch(() => form.startTime, (v) => {
  if (form.endTime <= v) {
    const idx = timeSlots.indexOf(v)
    form.endTime = timeSlots[Math.min(idx + 2, timeSlots.length - 1)]
  }
})

// --- 提出処理 ---
async function submitShift(startTime: string, endTime: string) {
  if (!selectedDate.value || !userId.value) return
  submitting.value = true
  formError.value = ''
  try {
    await $fetch('/api/shift-requests', {
      method: 'POST',
      body: { userId: userId.value, date: selectedDate.value, startTime, endTime },
    })
    await refreshRequests()
    closeModal()
  } catch (e: unknown) {
    formError.value = (e as { statusMessage?: string })?.statusMessage ?? '提出に失敗しました'
  } finally {
    submitting.value = false
  }
}

// --- 表示ユーティリティ ---
function formatTime(iso: string): string {
  const d = new Date(iso)
  const min = (d.getUTCHours() * 60 + d.getUTCMinutes() + 540) % 1440
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}
const positionLabel: Record<string, string> = {
  HALL: 'ホール', KITCHEN: 'キッチン', CASHIER: 'レジ', MANAGER: '管理', OTHER: 'その他',
}

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await navigateTo('/')
}
</script>

<template>
  <main class="min-h-screen bg-slate-50 p-4 sm:p-6">
    <div class="mx-auto max-w-2xl">

      <!-- 未ログイン -->
      <div v-if="!me" class="mt-12 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 class="text-xl font-bold text-slate-800">ログインが必要です</h1>
        <NuxtLink to="/" class="mt-4 inline-block text-sm font-medium text-brand hover:underline">トップへ戻る</NuxtLink>
      </div>

      <template v-else>
        <!-- ヘッダー -->
        <header class="mb-6 flex items-end justify-between">
          <div>
            <h1 class="text-2xl font-bold text-slate-800">マイシフト</h1>
            <p class="mt-0.5 text-sm text-slate-500">
              {{ me.name }} さん ／
              <span class="font-medium">{{ me.employmentType === 'FULL_TIME' ? '社員' : 'アルバイト' }}</span>
            </p>
          </div>
          <button
            class="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
            @click="logout"
          >ログアウト</button>
        </header>

        <!-- カレンダーセクション -->
        <section class="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm">
          <!-- 月ナビ -->
          <div class="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <button class="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100" @click="prevMonth">‹ 前月</button>
            <span class="text-sm font-semibold text-slate-700">{{ monthLabel }}</span>
            <button class="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100" @click="nextMonth">翌月 ›</button>
          </div>

          <!-- 凡例 -->
          <div class="flex flex-wrap gap-x-4 gap-y-1 px-5 py-2 text-xs text-slate-500">
            <span v-for="(cfg, key) in STATUS_CONFIG" :key="key" class="flex items-center gap-1">
              <span class="inline-block h-2.5 w-2.5 rounded-full" :class="cfg.dot" />
              {{ cfg.label }}
            </span>
            <span class="flex items-center gap-1">
              <span class="inline-block h-2.5 w-2.5 rounded-full bg-slate-200" />
              未提出
            </span>
          </div>

          <!-- グリッド -->
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
                <!-- 空白セル -->
                <div v-if="!cell" />
                <!-- 日付セル -->
                <button
                  v-else
                  class="flex h-full w-full flex-col items-center justify-center rounded-lg text-sm font-medium transition"
                  :class="[
                    cell.isToday ? 'ring-2 ring-brand ring-offset-1' : '',
                    cell.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700'
                    : cell.status === 'pending'  ? 'bg-amber-50 text-amber-700'
                    : cell.status === 'rejected' ? 'bg-rose-50 text-rose-700'
                    : 'text-slate-700 hover:bg-slate-100'
                  ]"
                  @click="openModal(cell.dateStr)"
                >
                  <span>{{ cell.day }}</span>
                  <span
                    v-if="cell.status"
                    class="mt-0.5 h-1.5 w-1.5 rounded-full"
                    :class="STATUS_CONFIG[cell.status]?.dot"
                  />
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- リスト: 希望シフト + 確定シフト -->
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">

          <!-- 提出済み希望シフト -->
          <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
            <h2 class="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">
              希望シフト（{{ monthLabel }}）
            </h2>
            <ul class="divide-y divide-slate-100">
              <li
                v-for="req in myRequests" :key="req.id"
                class="flex items-center justify-between px-5 py-3 text-sm"
              >
                <div>
                  <p class="font-medium text-slate-800">{{ req.date }}</p>
                  <p class="text-slate-500">{{ formatTime(req.startTime) }}〜{{ formatTime(req.endTime) }}</p>
                </div>
                <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="requestStatusCfg(req.status).badge">
                  {{ requestStatusCfg(req.status).label }}
                </span>
              </li>
              <li v-if="myRequests.length === 0" class="px-5 py-8 text-center text-sm text-slate-400">
                この月の提出はありません
              </li>
            </ul>
          </section>

          <!-- 確定シフト -->
          <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
            <h2 class="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">
              確定シフト（{{ monthLabel }}）
            </h2>
            <ul class="divide-y divide-slate-100">
              <li
                v-for="shift in myFinalShifts" :key="shift.id"
                class="flex items-center justify-between px-5 py-3 text-sm"
              >
                <div>
                  <p class="font-medium text-slate-800">{{ shift.date }}</p>
                  <p class="text-slate-500">{{ formatTime(shift.startTime) }}〜{{ formatTime(shift.endTime) }}</p>
                  <p class="text-xs text-slate-400">{{ shift.shops?.name }}</p>
                </div>
                <span class="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  {{ positionLabel[shift.position] ?? shift.position }}
                </span>
              </li>
              <li v-if="myFinalShifts.length === 0" class="px-5 py-8 text-center text-sm text-slate-400">
                この月の確定シフトはありません
              </li>
            </ul>
          </section>

        </div>
      </template>
    </div>

    <!-- モーダル -->
    <Teleport to="body">
      <div
        v-if="showModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        @click.self="closeModal"
      >
        <div class="w-full max-w-sm rounded-xl bg-white shadow-xl">
          <!-- モーダルヘッダー -->
          <div class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 class="font-semibold text-slate-800">{{ selectedDateLabel }}</h3>
            <button class="text-slate-400 hover:text-slate-600" @click="closeModal">✕</button>
          </div>

          <div class="px-5 py-5">

            <!-- 確定済み -->
            <template v-if="selectedFinal">
              <div class="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <span class="text-base">✅</span>
                <div>
                  <p class="font-semibold">確定済みです</p>
                  <p>{{ formatTime(selectedFinal.startTime) }}〜{{ formatTime(selectedFinal.endTime) }} ／ {{ positionLabel[selectedFinal.position] ?? selectedFinal.position }}</p>
                </div>
              </div>
            </template>

            <!-- 提出済み（申請中 or 却下） -->
            <template v-else-if="selectedRequest">
              <div
                class="flex items-center gap-2 rounded-lg px-4 py-3 text-sm"
                :class="requestStatusCfg(selectedRequest.status).badge"
              >
                <div>
                  <p class="font-semibold">{{ requestStatusCfg(selectedRequest.status).label }}</p>
                  <p>{{ formatTime(selectedRequest.startTime) }}〜{{ formatTime(selectedRequest.endTime) }}</p>
                </div>
              </div>
            </template>

            <!-- 未提出：社員 -->
            <template v-else-if="me?.employmentType === 'FULL_TIME'">
              <p class="mb-4 text-sm text-slate-500">出勤・欠勤を選択してください</p>
              <div class="flex gap-3">
                <button
                  class="flex-1 rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
                  :disabled="submitting"
                  @click="submitShift('09:00', '18:00')"
                >
                  {{ submitting ? '提出中…' : '出勤（09:00〜18:00）' }}
                </button>
                <button
                  class="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  @click="closeModal"
                >
                  欠勤
                </button>
              </div>
            </template>

            <!-- 未提出：アルバイト -->
            <template v-else>
              <p class="mb-4 text-sm text-slate-500">勤務時間を選択してください</p>
              <div class="mb-4 grid grid-cols-2 gap-3">
                <label class="block">
                  <span class="mb-1 block text-xs font-medium text-slate-600">開始時間</span>
                  <select
                    v-model="form.startTime"
                    class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                  >
                    <option v-for="t in timeSlots.slice(0, -1)" :key="t" :value="t">{{ t }}</option>
                  </select>
                </label>
                <label class="block">
                  <span class="mb-1 block text-xs font-medium text-slate-600">終了時間</span>
                  <select
                    v-model="form.endTime"
                    class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                  >
                    <option v-for="t in endTimeSlots" :key="t" :value="t">{{ t }}</option>
                  </select>
                </label>
              </div>
              <p v-if="formError" class="mb-2 text-xs text-rose-600">{{ formError }}</p>
              <button
                class="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
                :disabled="submitting"
                @click="submitShift(form.startTime, form.endTime)"
              >
                {{ submitting ? '提出中…' : '希望を提出する' }}
              </button>
            </template>

          </div>
        </div>
      </div>
    </Teleport>
  </main>
</template>
