<script setup lang="ts">
/**
 * スタッフページ（一般スタッフ用）
 * 対象Role: STAFF
 * - 希望シフト提出フォーム（日付・開始/終了時間）→ Supabase へ保存
 * - 自分の希望シフト / 確定シフトを Supabase から取得して表示
 *
 * ※ 認証未導入のため、暫定で「閲覧するスタッフ」を選択する。
 *    認証導入後はログイン中ユーザーに固定する。
 */

type ShiftStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

interface StaffOption {
  id: string
  name: string
  email: string
  employmentType: 'PART_TIME' | 'FULL_TIME' | null
  primaryShopId: string | null
}

interface ShiftRequest {
  id: string
  date: string
  startTime: string
  endTime: string
  status: ShiftStatus
  note: string | null
  shopId: string
}

interface FinalShift {
  id: string
  date: string
  startTime: string
  endTime: string
  position: string
  shopId: string
  shops: { name: string } | null
}

// --- 閲覧スタッフの選択（認証導入までの暫定） ---
const { data: staffOptions } = await useFetch<StaffOption[]>('/api/staff', {
  default: () => [],
})
const selectedUserId = ref<string>(staffOptions.value[0]?.id ?? '')

// --- 希望シフト / 確定シフト（選択スタッフに連動） ---
const { data: myRequests, refresh: refreshRequests } = await useFetch<ShiftRequest[]>(
  '/api/shift-requests',
  { query: { userId: selectedUserId }, watch: [selectedUserId], default: () => [] },
)
const { data: finalShifts } = await useFetch<FinalShift[]>('/api/final-shifts', {
  query: { userId: selectedUserId },
  watch: [selectedUserId],
  default: () => [],
})

// --- 希望シフト提出フォーム ---
const form = reactive({
  date: '',
  startTime: '09:00',
  endTime: '17:00',
  note: '',
})
const submitting = ref(false)
const formError = ref('')

async function submitRequest() {
  if (!form.date || !selectedUserId.value) return
  submitting.value = true
  formError.value = ''
  try {
    await $fetch('/api/shift-requests', {
      method: 'POST',
      body: {
        userId: selectedUserId.value,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        note: form.note,
      },
    })
    form.date = ''
    form.note = ''
    await refreshRequests()
  } catch (e: unknown) {
    formError.value = e instanceof Error ? e.message : '希望シフトの提出に失敗しました'
  } finally {
    submitting.value = false
  }
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

// 表示用ラベル
const statusStyle: Record<ShiftStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700',
}
const statusLabel: Record<ShiftStatus, string> = {
  PENDING: '申請中',
  APPROVED: '承認済み',
  REJECTED: '却下',
}
const positionLabel: Record<string, string> = {
  HALL: 'ホール',
  KITCHEN: 'キッチン',
  CASHIER: 'レジ',
  MANAGER: '管理',
  OTHER: 'その他',
}
</script>

<template>
  <main class="min-h-screen bg-slate-50 p-6">
    <div class="mx-auto max-w-4xl">
      <!-- ヘッダー -->
      <header class="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-brand">STAFF</p>
          <h1 class="text-2xl font-bold text-slate-800">マイシフト</h1>
        </div>
        <!-- 閲覧スタッフ選択（認証導入までの暫定） -->
        <label class="block">
          <span class="mb-1 block text-xs font-medium text-slate-500">閲覧スタッフ（暫定）</span>
          <select
            v-model="selectedUserId"
            class="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option v-if="staffOptions.length === 0" value="">スタッフがいません</option>
            <option v-for="s in staffOptions" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </label>
      </header>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <!-- 希望シフト提出フォーム -->
        <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 class="mb-4 text-lg font-semibold text-slate-800">希望シフトを提出</h2>
          <form class="space-y-4" @submit.prevent="submitRequest">
            <label class="block">
              <span class="mb-1 block text-sm font-medium text-slate-600">日付</span>
              <input
                v-model="form.date"
                type="date"
                required
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </label>
            <div class="grid grid-cols-2 gap-4">
              <label class="block">
                <span class="mb-1 block text-sm font-medium text-slate-600">開始時間</span>
                <input
                  v-model="form.startTime"
                  type="time"
                  class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </label>
              <label class="block">
                <span class="mb-1 block text-sm font-medium text-slate-600">終了時間</span>
                <input
                  v-model="form.endTime"
                  type="time"
                  class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </label>
            </div>
            <label class="block">
              <span class="mb-1 block text-sm font-medium text-slate-600">備考（任意）</span>
              <textarea
                v-model="form.note"
                rows="2"
                placeholder="例: 18時以降は勤務不可"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </label>
            <p v-if="formError" class="text-sm text-rose-600">{{ formError }}</p>
            <button
              type="submit"
              :disabled="submitting || !selectedUserId"
              class="w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {{ submitting ? '提出中…' : '希望を提出する' }}
            </button>
          </form>

          <!-- 提出済み希望シフト -->
          <div class="mt-6">
            <h3 class="mb-2 text-sm font-semibold text-slate-700">提出済みの希望</h3>
            <ul class="space-y-2">
              <li
                v-for="req in myRequests"
                :key="req.id"
                class="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
              >
                <span class="text-slate-700">{{ req.date }} {{ formatTime(req.startTime) }}〜{{ formatTime(req.endTime) }}</span>
                <span class="rounded-full px-2.5 py-0.5 text-xs font-medium" :class="statusStyle[req.status]">
                  {{ statusLabel[req.status] }}
                </span>
              </li>
              <li v-if="myRequests.length === 0" class="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
                提出済みの希望はまだありません
              </li>
            </ul>
          </div>
        </section>

        <!-- 確定シフト簡易カレンダー -->
        <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 class="mb-4 text-lg font-semibold text-slate-800">確定シフト</h2>
          <ul class="space-y-3">
            <li
              v-for="shift in finalShifts"
              :key="shift.id"
              class="rounded-lg border border-slate-200 p-4"
            >
              <div class="flex items-center justify-between">
                <p class="font-semibold text-slate-800">{{ shift.date }}</p>
                <span class="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-brand">
                  {{ positionLabel[shift.position] ?? shift.position }}
                </span>
              </div>
              <p class="mt-1 text-sm text-slate-600">{{ formatTime(shift.startTime) }} 〜 {{ formatTime(shift.endTime) }}</p>
              <p class="mt-0.5 text-xs text-slate-400">{{ shift.shops?.name ?? '' }}</p>
            </li>
            <li v-if="finalShifts.length === 0" class="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
              確定したシフトはまだありません
            </li>
          </ul>
        </section>
      </div>
    </div>
  </main>
</template>
