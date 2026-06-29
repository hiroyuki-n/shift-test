<script setup lang="ts">
definePageMeta({
  layout: 'shop',
  validate: (route) => /^\d{4}-\d{2}-\d{2}$/.test(String(route.params.date)),
})

interface FinalShift {
  id: number; date: string; startTime: string; endTime: string
  userId: number; shopId: number; hourlywage: number | null
  users: { name: string; employmentType: string | null } | null
  shop_positions: { name: string } | null
}

interface AttendanceRecord {
  id: number; date: string; userId: number; shopId: number
  startTime: string | null; endTime: string | null
  breakStartTime: string | null; breakEndTime: string | null
  overtimeMinutes: number | null; isAbsent: boolean
}

interface FormEntry {
  startTime: string; endTime: string
  breakStartTime: string; breakEndTime: string
  isAbsent: boolean
}

const route  = useRoute()
const shopId = route.params.shopId as string
const date   = route.params.date as string

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

const { data: finalShiftsRaw } = await useFetch<FinalShift[]>('/api/final-shifts', {
  query: { shopId, date }, default: () => [],
})
const { data: records, refresh: refreshRecords } = await useFetch<AttendanceRecord[]>('/api/attendance-records', {
  query: { shopId, date }, default: () => [],
})

// 社員を除外
const finalShifts = computed(() =>
  finalShiftsRaw.value.filter(s => s.users?.employmentType !== 'FULL_TIME')
)

function formatTime(iso: string): string {
  const d = new Date(iso)
  const min = (d.getUTCHours() * 60 + d.getUTCMinutes() + 540) % 1440
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
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

const formMap = ref<Record<number, FormEntry>>({})

watch(
  [finalShifts, records],
  () => {
    finalShifts.value.forEach(s => {
      if (formMap.value[s.userId]) return
      const rec = records.value.find(r => r.userId === s.userId)
      formMap.value[s.userId] = rec
        ? {
            startTime:      rec.startTime      ? formatTime(rec.startTime)      : formatTime(s.startTime),
            endTime:        rec.endTime        ? formatTime(rec.endTime)        : formatTime(s.endTime),
            breakStartTime: rec.breakStartTime ? formatTime(rec.breakStartTime) : '',
            breakEndTime:   rec.breakEndTime   ? formatTime(rec.breakEndTime)   : '',
            isAbsent: rec.isAbsent,
          }
        : {
            startTime: formatTime(s.startTime), endTime: formatTime(s.endTime),
            breakStartTime: '', breakEndTime: '', isAbsent: false,
          }
    })
  },
  { immediate: true },
)

function endTimeOptions(userId: number): string[] {
  const start = formMap.value[userId]?.startTime ?? '06:00'
  return timeOptions.filter(t => t > start)
}

function breakStartOptions(userId: number): string[] {
  const entry = formMap.value[userId]
  if (!entry?.startTime || !entry?.endTime) return []
  return timeOptions.filter(t => t >= entry.startTime && t < entry.endTime)
}

function breakEndOptions(userId: number): string[] {
  const entry = formMap.value[userId]
  if (!entry?.breakStartTime || !entry?.endTime) return []
  return timeOptions.filter(t => t > entry.breakStartTime && t <= entry.endTime)
}

function onStartTimeChange(userId: number) {
  const entry = formMap.value[userId]
  if (!entry) return
  if (!timeOptions.filter(t => t > entry.startTime).includes(entry.endTime))
    entry.endTime = timeOptions.filter(t => t > entry.startTime)[0] ?? entry.endTime
  if (entry.breakStartTime && entry.breakStartTime < entry.startTime) {
    entry.breakStartTime = ''
    entry.breakEndTime   = ''
  }
}

function onEndTimeChange(userId: number) {
  const entry = formMap.value[userId]
  if (!entry) return
  if (entry.breakStartTime && entry.breakStartTime >= entry.endTime) {
    entry.breakStartTime = ''
    entry.breakEndTime   = ''
  } else if (entry.breakEndTime && entry.breakEndTime > entry.endTime) {
    entry.breakEndTime = ''
  }
}

// 残業自動算出: 実際の退勤 − 確定シフト退勤（分）、マイナスは0
function calcOvertime(shiftEndIso: string, actualEndTime: string): number {
  const d = new Date(shiftEndIso)
  const shiftEnd = (d.getUTCHours() * 60 + d.getUTCMinutes() + 540) % 1440
  const [h, m]   = actualEndTime.split(':').map(Number)
  return Math.max(0, h * 60 + m - shiftEnd)
}

function onBreakStartChange(userId: number) {
  const entry = formMap.value[userId]
  if (!entry || !entry.breakStartTime) return
  if (entry.breakEndTime && (entry.breakEndTime <= entry.breakStartTime || entry.breakEndTime > entry.endTime))
    entry.breakEndTime = timeOptions.filter(t => t > entry.breakStartTime && t <= entry.endTime)[0] ?? ''
}

// 人件費計算
function timeToMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function minToLabel(min: number): string {
  if (min <= 0) return '—'
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}時間${m}分` : `${h}時間`
}

// 確定シフトの時間数
function scheduledMin(shift: FinalShift): number {
  const d1 = new Date(shift.startTime)
  const d2 = new Date(shift.endTime)
  const s = (d1.getUTCHours() * 60 + d1.getUTCMinutes() + 540) % 1440
  const e = (d2.getUTCHours() * 60 + d2.getUTCMinutes() + 540) % 1440
  return Math.max(0, e - s)
}

// 休憩時間（分）
function breakMin(userId: number): number {
  const form = formMap.value[userId]
  if (!form?.breakStartTime || !form?.breakEndTime) return 0
  return Math.max(0, timeToMin(form.breakEndTime) - timeToMin(form.breakStartTime))
}

// 残業時間（分）
function overtimeMin(shift: FinalShift): number {
  const form = formMap.value[shift.userId]
  if (!form || form.isAbsent || !form.endTime) return 0
  return calcOvertime(shift.endTime, form.endTime)
}

// 実働時間（分）= 出勤〜退勤 − 休憩
function netMin(shift: FinalShift): number {
  const form = formMap.value[shift.userId]
  if (!form || form.isAbsent || !form.startTime || !form.endTime) return 0
  const work = timeToMin(form.endTime) - timeToMin(form.startTime)
  return Math.max(0, work - breakMin(shift.userId))
}

function laborCost(shift: FinalShift): number {
  if (!shift.hourlywage) return 0
  return Math.round(netMin(shift) / 60 * shift.hourlywage)
}

const totalLaborCost = computed(() =>
  finalShifts.value.reduce((sum, s) => sum + laborCost(s), 0)
)

const submitting  = ref(false)
const submitError = ref('')
const submitted   = ref(false)
const reEditing   = ref(false)

const isSubmitted = computed(() => (submitted.value || isAllRecorded.value) && !reEditing.value)

const isAllRecorded = computed(() =>
  finalShifts.value.length > 0 &&
  finalShifts.value.every(s => records.value.some(r => r.userId === s.userId))
)

async function submitAll() {
  submitting.value  = true
  submitError.value = ''
  try {
    await Promise.all(
      finalShifts.value.map(async (shift) => {
        const form = formMap.value[shift.userId]
        if (!form) return
        const existing = records.value.find(r => r.userId === shift.userId)
        const overtimeMinutes = form.isAbsent ? null : calcOvertime(shift.endTime, form.endTime) || null
        const body = {
          date,
          startTime:      form.startTime,
          endTime:        form.endTime,
          breakStartTime: form.breakStartTime || null,
          breakEndTime:   form.breakEndTime   || null,
          overtimeMinutes,
          isAbsent:       form.isAbsent,
        }
        if (existing) {
          await $fetch(`/api/attendance-records/${existing.id}`, { method: 'PATCH', body })
        } else {
          await $fetch('/api/attendance-records', {
            method: 'POST',
            body: { ...body, userId: shift.userId, shopId: Number(shopId) },
          })
        }
      })
    )
    await refreshRecords()
    submitted.value = true
    reEditing.value = false
  } catch (e: unknown) {
    submitError.value = (e as { statusMessage?: string })?.statusMessage ?? '提出に失敗しました'
  } finally {
    submitting.value = false
  }
}

function hasRecord(userId: number): boolean {
  return records.value.some(r => r.userId === userId)
}
</script>

<template>
  <div class="mx-auto max-w-6xl p-6 lg:p-8">
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

    <!-- 提出ボタン -->
    <div v-if="finalShifts.length > 0" class="mb-4 flex items-center gap-3">
      <template v-if="isSubmitted">
        <span class="rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white">提出済み</span>
        <button
          class="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
          @click="reEditing = true; submitted = false"
        >再編集</button>
      </template>
      <template v-else>
        <button
          class="rounded-lg px-6 py-2.5 text-sm font-semibold transition disabled:opacity-50 bg-brand text-white hover:bg-brand-dark"
          :disabled="submitting"
          @click="submitAll"
        >{{ submitting ? '提出中…' : '提出する' }}</button>
        <p v-if="submitError" class="text-sm text-rose-500">{{ submitError }}</p>
      </template>
    </div>

    <div
      v-if="finalShifts.length === 0"
      class="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400 shadow-sm"
    >
      この日のアルバイトの確定シフトがありません
    </div>

    <section v-else class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
      <div class="border-b border-slate-100 px-5 py-3">
        <h2 class="text-sm font-semibold text-slate-700">
          勤怠入力
          <span class="ml-1.5 font-normal text-slate-400">{{ finalShifts.length }}人</span>
        </h2>
      </div>
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-slate-100 bg-slate-50 text-xs font-medium text-slate-500">
            <th class="px-4 py-3 text-left">スタッフ</th>
            <th class="px-3 py-3 text-left whitespace-nowrap">確定シフト</th>
            <th class="px-3 py-3 text-left">出勤</th>
            <th class="px-3 py-3 text-left">退勤</th>
            <th class="px-3 py-3 text-left whitespace-nowrap">休憩</th>
            <th class="px-3 py-3 text-center w-16">欠勤</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <template v-for="shift in finalShifts" :key="shift.id">
            <tr
              v-if="formMap[shift.userId]"
              class="transition-colors"
              :class="[
                hasRecord(shift.userId) ? 'bg-emerald-50/40' : 'hover:bg-slate-50',
                formMap[shift.userId].isAbsent ? 'opacity-60' : '',
              ]"
            >
              <!-- スタッフ名 -->
              <td class="px-4 py-3">
                <div class="flex items-center gap-1.5">
                  <span class="h-1.5 w-1.5 shrink-0 rounded-full"
                    :class="hasRecord(shift.userId) ? (formMap[shift.userId].isAbsent ? 'bg-rose-400' : 'bg-emerald-400') : 'bg-slate-300'" />
                  <span class="font-medium text-slate-800">{{ shift.users?.name ?? '—' }}</span>
                  <span v-if="shift.shop_positions" class="rounded-full bg-indigo-50 px-1.5 py-0.5 text-xs text-indigo-500">{{ shift.shop_positions.name }}</span>
                </div>
              </td>

              <!-- 確定シフト参照 -->
              <td class="px-3 py-3 text-xs text-slate-400 whitespace-nowrap">
                {{ formatTime(shift.startTime) }}〜{{ formatTime(shift.endTime) }}
              </td>

              <!-- 出勤 -->
              <td class="px-3 py-3">
                <select v-if="!formMap[shift.userId].isAbsent"
                  v-model="formMap[shift.userId].startTime"
                  :disabled="isSubmitted"
                  class="rounded border border-slate-200 px-1.5 py-1 text-xs focus:border-brand focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  @change="onStartTimeChange(shift.userId)"
                >
                  <option v-for="t in timeOptions" :key="t" :value="t">{{ t }}</option>
                </select>
                <span v-else class="text-xs text-rose-400">—</span>
              </td>

              <!-- 退勤 -->
              <td class="px-3 py-3">
                <select v-if="!formMap[shift.userId].isAbsent"
                  v-model="formMap[shift.userId].endTime"
                  :disabled="isSubmitted"
                  class="rounded border border-slate-200 px-1.5 py-1 text-xs focus:border-brand focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  @change="onEndTimeChange(shift.userId)"
                >
                  <option v-for="t in endTimeOptions(shift.userId)" :key="t" :value="t">{{ t }}</option>
                </select>
                <span v-else class="text-xs text-rose-400">—</span>
              </td>

              <!-- 休憩（開始〜終了） -->
              <td class="px-3 py-3">
                <template v-if="!formMap[shift.userId].isAbsent">
                  <div class="flex items-center gap-1 whitespace-nowrap">
                    <select
                      v-model="formMap[shift.userId].breakStartTime"
                      :disabled="isSubmitted || !formMap[shift.userId].startTime || !formMap[shift.userId].endTime"
                      class="rounded border border-slate-200 px-1.5 py-1 text-xs focus:border-brand focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                      @change="onBreakStartChange(shift.userId)"
                    >
                      <option value="">—</option>
                      <option v-for="t in breakStartOptions(shift.userId)" :key="t" :value="t">{{ t }}</option>
                    </select>
                    <span class="text-xs text-slate-300">〜</span>
                    <select
                      v-model="formMap[shift.userId].breakEndTime"
                      :disabled="isSubmitted || !formMap[shift.userId].breakStartTime"
                      class="rounded border border-slate-200 px-1.5 py-1 text-xs focus:border-brand focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <option value="">—</option>
                      <option v-for="t in breakEndOptions(shift.userId)" :key="t" :value="t">{{ t }}</option>
                    </select>
                  </div>
                </template>
                <span v-else class="text-xs text-rose-400">—</span>
              </td>

              <!-- 欠勤トグル -->
              <td class="px-3 py-3 text-center">
                <button
                  class="rounded px-2 py-1.5 text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                  :disabled="isSubmitted"
                  :class="formMap[shift.userId].isAbsent
                    ? 'bg-rose-100 text-rose-600 hover:bg-rose-200'
                    : 'border border-slate-200 text-slate-400 hover:bg-slate-100'"
                  @click="formMap[shift.userId].isAbsent = !formMap[shift.userId].isAbsent; submitted = false"
                >欠勤</button>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </section>

    <!-- 人件費 -->
    <section v-if="finalShifts.length > 0" class="mt-4 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div class="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <h2 class="text-sm font-semibold text-slate-700">人件費</h2>
        <span class="text-lg font-bold text-slate-800">¥{{ totalLaborCost.toLocaleString() }}</span>
      </div>
      <table class="w-full text-xs">
        <thead>
          <tr class="border-b border-slate-100 bg-slate-50 text-slate-400 font-medium">
            <th class="px-5 py-2 text-left">スタッフ</th>
            <th class="px-4 py-2 text-center">確定時間</th>
            <th class="px-4 py-2 text-center">休憩</th>
            <th class="px-4 py-2 text-center">残業</th>
            <th class="px-4 py-2 text-center">実働時間</th>
            <th class="px-4 py-2 text-center">時給</th>
            <th class="px-4 py-2 text-right">人件費</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          <tr v-for="shift in finalShifts" :key="shift.id" class="text-slate-600">
            <td class="px-5 py-2 font-medium text-slate-800">{{ shift.users?.name ?? '—' }}</td>

            <!-- 確定時間 -->
            <td class="px-4 py-2 text-center">{{ minToLabel(scheduledMin(shift)) }}</td>

            <!-- 休憩 -->
            <td class="px-4 py-2 text-center">{{ minToLabel(breakMin(shift.userId)) }}</td>

            <!-- 残業 -->
            <td class="px-4 py-2 text-center">
              <span v-if="formMap[shift.userId]?.isAbsent" class="text-rose-400">—</span>
              <span v-else :class="overtimeMin(shift) > 0 ? 'text-amber-600 font-medium' : ''">
                {{ minToLabel(overtimeMin(shift)) }}
              </span>
            </td>

            <!-- 実働時間 -->
            <td class="px-4 py-2 text-center">
              <span v-if="formMap[shift.userId]?.isAbsent" class="text-rose-400">欠勤</span>
              <span v-else>{{ minToLabel(netMin(shift)) }}</span>
            </td>

            <!-- 時給 -->
            <td class="px-4 py-2 text-center">
              {{ shift.hourlywage != null ? `¥${shift.hourlywage.toLocaleString()}` : '—' }}
            </td>

            <!-- 人件費 -->
            <td class="px-4 py-2 text-right font-medium">
              <span v-if="formMap[shift.userId]?.isAbsent || !shift.hourlywage" class="text-slate-300">—</span>
              <span v-else>¥{{ laborCost(shift).toLocaleString() }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

  </div>
</template>
