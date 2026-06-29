<script setup lang="ts">
definePageMeta({ layout: 'shop' })
useHead({ title: 'スタッフ詳細' })

type ShiftStatus    = 'PENDING' | 'APPROVED' | 'REJECTED'
type EmploymentType = 'PART_TIME' | 'FULL_TIME'

interface StaffInfo {
  id: number
  name: string
  employmentType: EmploymentType | null
  isActive: boolean
  primaryShopId: number | null
  createdAt: string
  updatedAt: string
  full_time_settings: Record<string, never> | null
  part_time_settings: { hourlywage: number | null } | null
}

interface ShiftRequest {
  id: number
  date: string
  startTime: string
  endTime: string
  status: ShiftStatus
  note: string | null
  shopId: number
}

interface FinalShift {
  id: number
  date: string
  startTime: string
  endTime: string
  positionId: number | null
  shopId: number
  shops: { name: string } | null
  shop_positions: { name: string } | null
}

const route  = useRoute()
const shopId = route.params.shopId as string
const userId = route.params.userId as string

const today = new Date()
const currentMonth = ref(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`)

const { data: staff } = await useFetch<StaffInfo>(`/api/staff/${userId}`)

const { data: requests } = await useFetch<ShiftRequest[]>('/api/shift-requests', {
  query: { userId, month: currentMonth },
  default: () => [],
})

const { data: finalShifts } = await useFetch<FinalShift[]>('/api/final-shifts', {
  query: { userId, month: currentMonth },
  default: () => [],
})

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

const employmentLabel: Record<EmploymentType, string> = {
  PART_TIME: 'アルバイト',
  FULL_TIME: '社員',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

const STATUS_CONFIG: Record<ShiftStatus, { label: string; badge: string }> = {
  PENDING:  { label: '保留',   badge: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: '入れる', badge: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: '外す',   badge: 'bg-rose-100 text-rose-700' },
}


function formatTime(iso: string): string {
  const d   = new Date(iso)
  const min = (d.getUTCHours() * 60 + d.getUTCMinutes() + 540) % 1440
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

// 月間稼働日数（確定シフト）
const workDays = computed(() => new Set(finalShifts.value.map(s => s.date)).size)
</script>

<template>
  <div class="mx-auto max-w-3xl p-8">

    <!-- ヘッダー -->
    <header class="mb-8">

      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">{{ staff?.name ?? '—' }}</h1>
          <div class="mt-1 flex items-center gap-2">
            <span
              class="rounded-full px-2.5 py-0.5 text-xs font-medium"
              :class="staff?.employmentType === 'FULL_TIME' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'"
            >
              {{ staff?.employmentType ? employmentLabel[staff.employmentType as EmploymentType] : '—' }}
            </span>
            <span class="text-xs text-slate-400">ID: {{ userId }}</span>
          </div>
        </div>

      </div>
    </header>

    <!-- 基本情報 -->
    <section class="mb-8 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div class="border-b border-slate-100 px-6 py-3">
        <h2 class="text-sm font-semibold text-slate-700">基本情報</h2>
      </div>
      <table class="w-full text-sm">
        <tbody class="divide-y divide-slate-100">
          <tr>
            <th class="w-36 bg-slate-50 px-6 py-3 text-left text-xs font-medium text-slate-500">スタッフID</th>
            <td class="px-6 py-3 font-mono text-xs text-slate-600">{{ staff?.id }}</td>
          </tr>
          <tr>
            <th class="bg-slate-50 px-6 py-3 text-left text-xs font-medium text-slate-500">氏名</th>
            <td class="px-6 py-3 font-medium text-slate-800">{{ staff?.name ?? '—' }}</td>
          </tr>
          <tr>
            <th class="bg-slate-50 px-6 py-3 text-left text-xs font-medium text-slate-500">雇用形態</th>
            <td class="px-6 py-3">
              <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                :class="staff?.employmentType === 'FULL_TIME' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'">
                {{ staff?.employmentType ? employmentLabel[staff.employmentType as EmploymentType] : '—' }}
              </span>
            </td>
          </tr>
          <tr v-if="staff?.employmentType === 'PART_TIME'">
            <th class="bg-slate-50 px-6 py-3 text-left text-xs font-medium text-slate-500">時給</th>
            <td class="px-6 py-3 font-medium text-slate-800">
              {{ staff.part_time_settings?.hourlywage != null
                ? `¥${staff.part_time_settings.hourlywage.toLocaleString()} / 時`
                : '未設定' }}
            </td>
          </tr>
          <tr>
            <th class="bg-slate-50 px-6 py-3 text-left text-xs font-medium text-slate-500">在籍状態</th>
            <td class="px-6 py-3">
              <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                :class="staff?.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'">
                {{ staff?.isActive ? '在籍中' : '退職済み' }}
              </span>
            </td>
          </tr>
          <tr>
            <th class="bg-slate-50 px-6 py-3 text-left text-xs font-medium text-slate-500">登録日</th>
            <td class="px-6 py-3 text-slate-600">{{ staff?.createdAt ? formatDate(staff.createdAt) : '—' }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- 月ナビゲーション -->
    <div class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <h2 class="text-sm font-semibold text-slate-700">{{ monthLabel }}</h2>
        <span class="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
          確定 {{ workDays }} 日
        </span>
        <span class="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
          申請中 {{ requests.filter(r => r.status === 'PENDING').length }} 件
        </span>
      </div>
      <div class="flex gap-2">
        <button class="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100" @click="prevMonth">‹ 前月</button>
        <button class="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100" @click="nextMonth">翌月 ›</button>
      </div>
    </div>

    <!-- チャート -->
    <ClientOnly>
      <StaffCharts
        :requests="requests"
        :final-shifts="finalShifts"
        :month="currentMonth"
        class="mb-6"
      />
      <template #fallback>
        <div class="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div class="h-64 animate-pulse rounded-xl bg-slate-100" />
          <div class="h-64 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </template>
    </ClientOnly>

    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">

      <!-- 希望シフト -->
      <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
        <h3 class="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">希望シフト</h3>
        <ul class="divide-y divide-slate-100">
          <li v-for="req in requests" :key="req.id" class="flex items-center justify-between px-5 py-3">
            <div>
              <p class="text-sm font-medium text-slate-800">{{ req.date }}</p>
              <p class="text-xs text-slate-500">{{ formatTime(req.startTime) }}〜{{ formatTime(req.endTime) }}</p>
            </div>
            <!-- 却下・確定どちらも「確定」、それ以外は「申請中」 -->
            <span
              class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
              :class="req.status === 'REJECTED'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'"
            >
              {{ req.status === 'REJECTED' ? '確定' : '申請中' }}
            </span>
          </li>
          <li v-if="requests.length === 0" class="px-5 py-8 text-center text-sm text-slate-400">
            この月の希望はありません
          </li>
        </ul>
      </section>

      <!-- 確定シフト -->
      <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
        <h3 class="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">確定シフト</h3>
        <ul class="divide-y divide-slate-100">
          <li v-for="shift in finalShifts" :key="shift.id" class="flex items-center justify-between px-5 py-3">
            <div>
              <p class="text-sm font-medium text-slate-800">{{ shift.date }}</p>
              <p class="text-xs text-slate-500">{{ formatTime(shift.startTime) }}〜{{ formatTime(shift.endTime) }}</p>
            </div>
            <span class="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              {{ shift.shop_positions?.name ?? '—' }}
            </span>
          </li>
          <li v-if="finalShifts.length === 0" class="px-5 py-8 text-center text-sm text-slate-400">
            この月の確定シフトはありません
          </li>
        </ul>
      </section>

    </div>
  </div>
</template>
