<script setup lang="ts">
definePageMeta({
  layout: 'shop',
  validate: (route) => /^\d{4}-\d{2}-\d{2}$/.test(String(route.params.date)),
})

interface FinalShift {
  id: number; date: string; startTime: string; endTime: string
  userId: number; shopId: number
  users: { name: string; employmentType: string | null } | null
  shop_positions: { name: string } | null
}

interface AttendanceRecord {
  id: number; date: string; userId: number; shopId: number
  startTime: string; endTime: string
  breakMinutes: number | null; overtimeMinutes: number | null; note: string | null
}

interface FormEntry {
  startTime: string; endTime: string
  breakMinutes: string; overtimeMinutes: string; note: string
}

const route  = useRoute()
const shopId = route.params.shopId as string
const date   = route.params.date as string

// 日付ナビゲーション
function offsetDate(d: string, days: number): string {
  const dt = new Date(`${d}T12:00:00+09:00`)
  dt.setDate(dt.getDate() + days)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

const dateLabel = computed(() =>
  new Date(`${date}T12:00:00+09:00`).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })
)

// データ取得
const { data: finalShifts } = await useFetch<FinalShift[]>('/api/final-shifts', {
  query: { shopId, date }, default: () => [],
})
const { data: records, refresh: refreshRecords } = await useFetch<AttendanceRecord[]>('/api/attendance-records', {
  query: { shopId, date }, default: () => [],
})

// 時間ユーティリティ
function formatTime(iso: string): string {
  const d = new Date(iso)
  const min = (d.getUTCHours() * 60 + d.getUTCMinutes() + 540) % 1440
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

function diffMinutes(shiftIso: string, actualTime: string, date: string): number {
  const shift  = new Date(shiftIso).getTime()
  const actual = new Date(`${date}T${actualTime}:00+09:00`).getTime()
  return Math.round((actual - shift) / 60000)
}

// 30分刻みオプション（06:00〜24:00）
const timeOptions: string[] = (() => {
  const opts: string[] = []
  for (let h = 6; h < 24; h++) {
    opts.push(`${String(h).padStart(2, '0')}:00`)
    opts.push(`${String(h).padStart(2, '0')}:30`)
  }
  opts.push('24:00')
  return opts
})()

// フォーム状態（userId → FormEntry）
const formMap = ref<Record<number, FormEntry>>({})

// 確定シフトをベースにフォームを初期化
watch(
  [finalShifts, records],
  () => {
    finalShifts.value.forEach(s => {
      if (formMap.value[s.userId]) return
      const rec = records.value.find(r => r.userId === s.userId)
      formMap.value[s.userId] = rec
        ? {
            startTime:       formatTime(rec.startTime),
            endTime:         formatTime(rec.endTime),
            breakMinutes:    rec.breakMinutes    != null ? String(rec.breakMinutes)    : '',
            overtimeMinutes: rec.overtimeMinutes != null ? String(rec.overtimeMinutes) : '',
            note:            rec.note ?? '',
          }
        : {
            startTime:       formatTime(s.startTime),
            endTime:         formatTime(s.endTime),
            breakMinutes:    '',
            overtimeMinutes: '',
            note:            '',
          }
    })
  },
  { immediate: true },
)

// 差異ラベル
function diffLabel(shiftIso: string, actualTime: string, isStart: boolean): { text: string; color: string } | null {
  const diff = diffMinutes(shiftIso, actualTime, date)
  if (diff === 0) return null
  const abs  = Math.abs(diff)
  const h    = Math.floor(abs / 60)
  const m    = abs % 60
  const str  = h > 0 ? `${h}時間${m > 0 ? m + '分' : ''}` : `${m}分`
  if (isStart) {
    return diff > 0
      ? { text: `${str}遅刻`, color: 'text-rose-500' }
      : { text: `${str}早出`, color: 'text-blue-500' }
  } else {
    return diff > 0
      ? { text: `${str}残業`, color: 'text-amber-500' }
      : { text: `${str}早退`, color: 'text-rose-500' }
  }
}

function endTimeOptions(userId: number): string[] {
  const start = formMap.value[userId]?.startTime ?? '06:00'
  return timeOptions.filter(t => t > start)
}

function onStartTimeChange(userId: number) {
  const entry = formMap.value[userId]
  if (!entry) return
  const opts = timeOptions.filter(t => t > entry.startTime)
  if (opts.length && !opts.includes(entry.endTime)) entry.endTime = opts[0]
}

// 保存・削除
const savingId  = ref<number | null>(null)
const deletingId = ref<number | null>(null)
const errorMap  = ref<Record<number, string>>({})

async function save(shift: FinalShift) {
  const form = formMap.value[shift.userId]
  if (!form) return
  savingId.value = shift.userId
  errorMap.value[shift.userId] = ''
  try {
    const existing = records.value.find(r => r.userId === shift.userId)
    const body = {
      date,
      startTime:       form.startTime,
      endTime:         form.endTime,
      breakMinutes:    form.breakMinutes    !== '' ? Number(form.breakMinutes)    : null,
      overtimeMinutes: form.overtimeMinutes !== '' ? Number(form.overtimeMinutes) : null,
      note:            form.note || null,
    }
    if (existing) {
      await $fetch(`/api/attendance-records/${existing.id}`, { method: 'PATCH', body })
    } else {
      await $fetch('/api/attendance-records', {
        method: 'POST',
        body: { ...body, userId: shift.userId, shopId: Number(shopId) },
      })
    }
    await refreshRecords()
  } catch (e: unknown) {
    errorMap.value[shift.userId] = (e as { statusMessage?: string })?.statusMessage ?? '保存に失敗しました'
  } finally {
    savingId.value = null
  }
}

async function remove(shift: FinalShift) {
  const existing = records.value.find(r => r.userId === shift.userId)
  if (!existing) return
  deletingId.value = shift.userId
  try {
    await $fetch(`/api/attendance-records/${existing.id}`, { method: 'DELETE' })
    // フォームをシフト時間にリセット
    formMap.value[shift.userId] = {
      startTime:       formatTime(shift.startTime),
      endTime:         formatTime(shift.endTime),
      breakMinutes:    '',
      overtimeMinutes: '',
      note:            '',
    }
    await refreshRecords()
  } finally {
    deletingId.value = null
  }
}

function hasRecord(userId: number): boolean {
  return records.value.some(r => r.userId === userId)
}
</script>

<template>
  <div class="mx-auto max-w-4xl p-6 lg:p-8">
    <!-- ヘッダー -->
    <header class="mb-6">
      <p class="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">勤怠記録</p>
      <div class="flex items-center gap-3">
        <NuxtLink
          :to="`/shop/${shopId}/attendance/${offsetDate(date, -1)}`"
          class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
        >‹ 前日</NuxtLink>
        <h1 class="text-xl font-bold text-slate-800">{{ dateLabel }}</h1>
        <NuxtLink
          :to="`/shop/${shopId}/attendance/${offsetDate(date, 1)}`"
          class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
        >翌日 ›</NuxtLink>
      </div>
    </header>

    <!-- スタッフなし -->
    <div
      v-if="finalShifts.length === 0"
      class="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400 shadow-sm"
    >
      この日の確定シフトがありません
    </div>

    <!-- スタッフリスト -->
    <div v-else class="space-y-4">
      <div
        v-for="shift in finalShifts"
        :key="shift.id"
        class="rounded-xl border bg-white shadow-sm"
        :class="hasRecord(shift.userId) ? 'border-emerald-200' : 'border-slate-200'"
      >
        <!-- スタッフヘッダー -->
        <div class="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-slate-800">{{ shift.users?.name ?? '—' }}</span>
            <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              {{ shift.users?.employmentType === 'FULL_TIME' ? '社員' : 'アルバイト' }}
            </span>
            <span v-if="shift.shop_positions" class="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600">
              {{ shift.shop_positions.name }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span
              class="rounded-full px-2.5 py-0.5 text-xs font-medium"
              :class="hasRecord(shift.userId) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'"
            >{{ hasRecord(shift.userId) ? '記録済み' : '未記録' }}</span>
          </div>
        </div>

        <!-- フォーム -->
        <div v-if="formMap[shift.userId]" class="p-5">
          <!-- 確定シフト参照 -->
          <p class="mb-3 text-xs text-slate-400">
            確定シフト：{{ formatTime(shift.startTime) }}〜{{ formatTime(shift.endTime) }}
            <span v-if="shift.users?.employmentType === 'FULL_TIME'">（終日）</span>
          </p>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <!-- 出勤時間 -->
            <div>
              <label class="mb-1 block text-xs font-medium text-slate-600">出勤時間</label>
              <div class="flex items-center gap-2">
                <select
                  v-model="formMap[shift.userId].startTime"
                  class="flex-1 rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-brand focus:outline-none"
                  @change="onStartTimeChange(shift.userId)"
                >
                  <option v-for="t in timeOptions" :key="t" :value="t">{{ t }}</option>
                </select>
                <span
                  v-if="shift.users?.employmentType !== 'FULL_TIME'"
                  class="text-xs"
                  :class="diffLabel(shift.startTime, formMap[shift.userId].startTime, true)?.color ?? 'text-slate-400'"
                >{{ diffLabel(shift.startTime, formMap[shift.userId].startTime, true)?.text ?? '±0' }}</span>
              </div>
            </div>

            <!-- 退勤時間 -->
            <div>
              <label class="mb-1 block text-xs font-medium text-slate-600">退勤時間</label>
              <div class="flex items-center gap-2">
                <select
                  v-model="formMap[shift.userId].endTime"
                  class="flex-1 rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-brand focus:outline-none"
                >
                  <option v-for="t in endTimeOptions(shift.userId)" :key="t" :value="t">{{ t }}</option>
                </select>
                <span
                  v-if="shift.users?.employmentType !== 'FULL_TIME'"
                  class="text-xs"
                  :class="diffLabel(shift.endTime, formMap[shift.userId].endTime, false)?.color ?? 'text-slate-400'"
                >{{ diffLabel(shift.endTime, formMap[shift.userId].endTime, false)?.text ?? '±0' }}</span>
              </div>
            </div>

            <!-- 休憩時間 -->
            <div>
              <label class="mb-1 block text-xs font-medium text-slate-600">休憩時間（分）</label>
              <input
                v-model="formMap[shift.userId].breakMinutes"
                type="number"
                min="0"
                step="5"
                placeholder="例: 60"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              />
            </div>

            <!-- 残業時間 -->
            <div>
              <label class="mb-1 block text-xs font-medium text-slate-600">残業時間（分）</label>
              <input
                v-model="formMap[shift.userId].overtimeMinutes"
                type="number"
                min="0"
                step="5"
                placeholder="例: 30"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          <!-- 備考 -->
          <div class="mt-4">
            <label class="mb-1 block text-xs font-medium text-slate-600">備考</label>
            <input
              v-model="formMap[shift.userId].note"
              type="text"
              placeholder="遅延理由・特記事項など"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>

          <!-- エラー -->
          <p v-if="errorMap[shift.userId]" class="mt-2 text-xs text-rose-500">{{ errorMap[shift.userId] }}</p>

          <!-- ボタン -->
          <div class="mt-4 flex gap-2">
            <button
              class="flex-1 rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
              :disabled="savingId === shift.userId"
              @click="save(shift)"
            >{{ savingId === shift.userId ? '保存中…' : '保存する' }}</button>
            <button
              v-if="hasRecord(shift.userId)"
              class="rounded-lg border border-rose-200 px-4 py-2.5 text-sm font-medium text-rose-500 hover:bg-rose-50 disabled:opacity-50"
              :disabled="deletingId === shift.userId"
              @click="remove(shift)"
            >削除</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
