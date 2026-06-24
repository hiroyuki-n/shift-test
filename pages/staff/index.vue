<script setup lang="ts">
/**
 * スタッフページ（一般スタッフ用）
 * 対象Role: STAFF
 * - 希望シフト提出フォーム（日付・開始/終了時間）
 * - 自分の確定シフトを確認する簡易カレンダー
 *
 * ※ middleware でログイン中ユーザー本人のデータのみ
 *    閲覧・提出できるよう制御する想定。
 */

interface ShiftRequest {
  id: string
  date: string
  startTime: string
  endTime: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
}

interface FinalShift {
  date: string
  startTime: string
  endTime: string
  position: string
  shopName: string
}

// --- 希望シフト提出フォーム ---
const form = reactive({
  date: '',
  startTime: '09:00',
  endTime: '17:00',
  note: '',
})

// --- 提出済みの希望シフト（モック） ---
const myRequests = ref<ShiftRequest[]>([
  { id: 'r-1', date: '2026-07-01', startTime: '09:00', endTime: '17:00', status: 'APPROVED' },
  { id: 'r-2', date: '2026-07-03', startTime: '12:00', endTime: '21:00', status: 'PENDING' },
])

// --- 確定シフト（モック） ---
const finalShifts = ref<FinalShift[]>([
  { date: '2026-07-01', startTime: '09:00', endTime: '17:00', position: 'ホール', shopName: '渋谷本店' },
  { date: '2026-07-05', startTime: '17:00', endTime: '22:00', position: 'キッチン', shopName: '新宿東口店（ヘルプ）' },
])

function submitRequest() {
  if (!form.date) return
  myRequests.value.unshift({
    id: `r-${Date.now()}`,
    date: form.date,
    startTime: form.startTime,
    endTime: form.endTime,
    status: 'PENDING',
  })
  form.date = ''
  form.note = ''
}

// ステータス表示用のスタイルマップ
const statusStyle: Record<ShiftRequest['status'], string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700',
}
const statusLabel: Record<ShiftRequest['status'], string> = {
  PENDING: '申請中',
  APPROVED: '承認済み',
  REJECTED: '却下',
}
</script>

<template>
  <main class="min-h-screen bg-slate-50 p-6">
    <div class="mx-auto max-w-4xl">
      <!-- ヘッダー -->
      <header class="mb-8">
        <p class="text-xs font-semibold uppercase tracking-wider text-brand">STAFF</p>
        <h1 class="text-2xl font-bold text-slate-800">マイシフト</h1>
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
            <button type="submit" class="w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
              希望を提出する
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
                <span class="text-slate-700">{{ req.date }} {{ req.startTime }}〜{{ req.endTime }}</span>
                <span class="rounded-full px-2.5 py-0.5 text-xs font-medium" :class="statusStyle[req.status]">
                  {{ statusLabel[req.status] }}
                </span>
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
              :key="`${shift.date}-${shift.startTime}`"
              class="rounded-lg border border-slate-200 p-4"
            >
              <div class="flex items-center justify-between">
                <p class="font-semibold text-slate-800">{{ shift.date }}</p>
                <span class="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-brand">
                  {{ shift.position }}
                </span>
              </div>
              <p class="mt-1 text-sm text-slate-600">{{ shift.startTime }} 〜 {{ shift.endTime }}</p>
              <p class="mt-0.5 text-xs text-slate-400">{{ shift.shopName }}</p>
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
