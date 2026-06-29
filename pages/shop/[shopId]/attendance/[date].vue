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
  startTime: string | null; endTime: string | null
  breakMinutes: number | null; overtimeMinutes: number | null
  isAbsent: boolean
}

interface FormEntry {
  startTime: string; endTime: string
  breakMinutes: string; overtimeMinutes: string
  isAbsent: boolean
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
            startTime:       rec.startTime ? formatTime(rec.startTime) : formatTime(s.startTime),
            endTime:         rec.endTime   ? formatTime(rec.endTime)   : formatTime(s.endTime),
            breakMinutes:    rec.breakMinutes    != null ? String(rec.breakMinutes)    : '',
            overtimeMinutes: rec.overtimeMinutes != null ? String(rec.overtimeMinutes) : '',
            isAbsent:        rec.isAbsent,
          }
        : {
            startTime:       formatTime(s.startTime),
            endTime:         formatTime(s.endTime),
            breakMinutes:    '',
            overtimeMinutes: '',
            isAbsent:        false,
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
      breakMinutes:    form.isAbsent || form.breakMinutes    === '' ? null : Number(form.breakMinutes),
      overtimeMinutes: form.isAbsent || form.overtimeMinutes === '' ? null : Number(form.overtimeMinutes),
      isAbsent:        form.isAbsent,
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
      isAbsent:        false,
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
  <div class="mx-auto max-w-6xl p-6 lg:p-8">
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

    <!-- テーブルリスト -->
    <section v-else class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-slate-100 bg-slate-50 text-xs font-medium text-slate-500">
            <th class="px-4 py-3 text-left">スタッフ</th>
            <th class="px-3 py-3 text-left">確定シフト</th>
            <th class="px-3 py-3 text-left">出勤</th>
            <th class="px-3 py-3 text-left">退勤</th>
            <th class="px-3 py-3 text-center w-20">休憩(分)</th>
            <th class="px-3 py-3 text-center w-20">残業(分)</th>
            <th class="px-3 py-3 text-center w-32"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <template v-for="shift in finalShifts" :key="shift.id">
            <tr
              v-if="formMap[shift.userId]"
              class="transition-colors"
              :class="hasRecord(shift.userId) ? 'bg-emerald-50/40' : 'hover:bg-slate-50'"
            >
              <!-- スタッフ名 -->
              <td class="px-4 py-3">
                <div class="flex items-center gap-1.5">
                  <span
                    class="h-1.5 w-1.5 shrink-0 rounded-full"
                    :class="hasRecord(shift.userId) ? 'bg-emerald-400' : 'bg-slate-300'"
                  />
                  <span class="font-medium text-slate-800">{{ shift.users?.name ?? '—' }}</span>
                  <span class="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-400">
                    {{ shift.users?.employmentType === 'FULL_TIME' ? '社員' : 'バイト' }}
                  </span>
                </div>
              </td>

              <!-- 確定シフト参照 -->
              <td class="px-3 py-3 text-xs text-slate-400 whitespace-nowrap">
                {{ formatTime(shift.startTime) }}〜{{ formatTime(shift.endTime) }}
              </td>

              <!-- 出勤時間 -->
              <td class="px-3 py-3">
                <template v-if="!formMap[shift.userId].isAbsent">
                  <div class="flex items-center gap-1">
                    <select
                      v-model="formMap[shift.userId].startTime"
                      class="rounded border border-slate-200 px-1.5 py-1 text-xs focus:border-brand focus:outline-none"
                      @change="onStartTimeChange(shift.userId)"
                    >
                      <option v-for="t in timeOptions" :key="t" :value="t">{{ t }}</option>
                    </select>
                    <span
                      v-if="diffLabel(shift.startTime, formMap[shift.userId].startTime, true)"
                      class="text-xs whitespace-nowrap"
                      :class="diffLabel(shift.startTime, formMap[shift.userId].startTime, true)!.color"
                    >{{ diffLabel(shift.startTime, formMap[shift.userId].startTime, true)!.text }}</span>
                  </div>
                </template>
                <span v-else class="text-xs text-rose-400">—</span>
              </td>

              <!-- 退勤時間 -->
              <td class="px-3 py-3">
                <template v-if="!formMap[shift.userId].isAbsent">
                  <div class="flex items-center gap-1">
                    <select
                      v-model="formMap[shift.userId].endTime"
                      class="rounded border border-slate-200 px-1.5 py-1 text-xs focus:border-brand focus:outline-none"
                    >
                      <option v-for="t in endTimeOptions(shift.userId)" :key="t" :value="t">{{ t }}</option>
                    </select>
                    <span
                      v-if="diffLabel(shift.endTime, formMap[shift.userId].endTime, false)"
                      class="text-xs whitespace-nowrap"
                      :class="diffLabel(shift.endTime, formMap[shift.userId].endTime, false)!.color"
                    >{{ diffLabel(shift.endTime, formMap[shift.userId].endTime, false)!.text }}</span>
                  </div>
                </template>
                <span v-else class="text-xs text-rose-400">—</span>
              </td>

              <!-- 休憩時間 -->
              <td class="px-3 py-3">
                <input
                  v-if="!formMap[shift.userId].isAbsent"
                  v-model="formMap[shift.userId].breakMinutes"
                  type="number" min="0" step="5" placeholder="—"
                  class="w-16 rounded border border-slate-200 px-2 py-1 text-center text-xs focus:border-brand focus:outline-none"
                />
                <span v-else class="block text-center text-xs text-rose-400">—</span>
              </td>

              <!-- 残業時間 -->
              <td class="px-3 py-3">
                <input
                  v-if="!formMap[shift.userId].isAbsent"
                  v-model="formMap[shift.userId].overtimeMinutes"
                  type="number" min="0" step="5" placeholder="—"
                  class="w-16 rounded border border-slate-200 px-2 py-1 text-center text-xs focus:border-brand focus:outline-none"
                />
                <span v-else class="block text-center text-xs text-rose-400">—</span>
              </td>

              <!-- 操作ボタン -->
              <td class="px-3 py-3">
                <div class="flex items-center justify-center gap-1">
                  <button
                    class="rounded px-2 py-1.5 text-xs font-semibold transition"
                    :class="formMap[shift.userId].isAbsent
                      ? 'bg-rose-100 text-rose-600 hover:bg-rose-200'
                      : 'border border-slate-200 text-slate-400 hover:bg-slate-100'"
                    @click="formMap[shift.userId].isAbsent = !formMap[shift.userId].isAbsent"
                  >欠勤</button>
                  <button
                    class="rounded bg-brand px-2 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-40"
                    :disabled="savingId === shift.userId"
                    @click="save(shift)"
                  >{{ savingId === shift.userId ? '…' : '保存' }}</button>
                  <button
                    v-if="hasRecord(shift.userId)"
                    class="rounded border border-rose-200 px-2 py-1.5 text-xs text-rose-400 hover:bg-rose-50 disabled:opacity-40"
                    :disabled="deletingId === shift.userId"
                    @click="remove(shift)"
                  >削除</button>
                </div>
                <p v-if="errorMap[shift.userId]" class="mt-1 text-center text-xs text-rose-500">{{ errorMap[shift.userId] }}</p>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </section>
  </div>
</template>
