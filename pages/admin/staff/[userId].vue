<script setup lang="ts">
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'

definePageMeta({ layout: 'admin' })

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

interface Shop { id: number; name: string }

const route  = useRoute()
const userId = route.params.userId as string

const { data: staff, refresh: refreshStaff } = await useFetch<StaffInfo>(`/api/staff/${userId}`)
const { data: shops } = await useFetch<Shop[]>('/api/shops', { default: () => [] })


// --- 設定の編集 ---
const settingValue  = ref<string | number | null>(null)
const settingSaving = ref(false)
const settingError  = ref('')

function initSettingEdit() {
  settingValue.value = staff.value?.part_time_settings?.hourlywage ?? null
  settingError.value = ''
}

async function saveSetting() {
  settingSaving.value = true; settingError.value = ''
  try {
    await $fetch(`/api/staff/${userId}/settings`, {
      method: 'PATCH',
      body: { hourlywage: Number(settingValue.value) },
    })
    await refreshStaff()
  } catch (e: unknown) {
    settingError.value = (e as { statusMessage?: string })?.statusMessage ?? '更新に失敗しました'
  } finally { settingSaving.value = false }
}

const shopName = computed(() =>
  staff.value?.primaryShopId
    ? shops.value.find(s => s.id === staff.value!.primaryShopId)?.name ?? '—'
    : '—',
)

// --- 給与計算（アルバイトのみ） ---
const currentYear = new Date().getFullYear()
const selectedYear = ref(currentYear)

const { data: yearShifts } = await useFetch<{ startTime: string; endTime: string; date: string; hourlywage: number | null }[]>(
  '/api/final-shifts',
  {
    query: { userId, year: selectedYear },
    default: () => [],
  },
)

function toJSTMinutes(iso: string) {
  const d = new Date(iso)
  return (d.getUTCHours() * 60 + d.getUTCMinutes() + 540) % 1440
}
function shiftHours(s: string, e: string) {
  return (toJSTMinutes(e) - toJSTMinutes(s)) / 60
}

// 現在の設定時給（未確定シフトの参考表示用）
const hourlywage = computed(() => staff.value?.part_time_settings?.hourlywage ?? 0)

// 月別給与（確定時点の時給 hourlywage を使用）
const monthlyEarnings = computed(() => {
  const map = new Map<string, number>()
  for (let m = 1; m <= 12; m++) {
    const key = `${selectedYear.value}-${String(m).padStart(2, '0')}`
    map.set(key, 0)
  }
  for (const s of yearShifts.value) {
    const key = s.date.slice(0, 7)
    const hours = shiftHours(s.startTime, s.endTime)
    const wage = s.hourlywage ?? hourlywage.value  // 記録がなければ現在の時給で代替
    map.set(key, (map.get(key) ?? 0) + hours * wage)
  }
  return Array.from(map.entries())
    .map(([month, amount]) => ({ month, amount: Math.round(amount) }))
})

const yearlyTotal = computed(() =>
  monthlyEarnings.value.reduce((sum, m) => sum + m.amount, 0),
)

const yearlyHours = computed(() =>
  Math.round(
    yearShifts.value.reduce((sum, s) => sum + shiftHours(s.startTime, s.endTime), 0) * 10,
  ) / 10,
)

const employmentLabel: Record<EmploymentType, string> = {
  PART_TIME: 'アルバイト',
  FULL_TIME: '社員',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}
</script>

<template>
  <div class="mx-auto max-w-2xl p-8">

    <header class="mb-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">{{ staff?.name ?? '—' }}</h1>
          <div class="mt-1 flex items-center gap-2">
            <span
              class="rounded-full px-2.5 py-0.5 text-xs font-medium"
              :class="staff?.employmentType === 'FULL_TIME' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'"
            >{{ staff?.employmentType ? employmentLabel[staff.employmentType] : '—' }}</span>
            <span class="text-xs text-slate-400">ID: {{ userId }}</span>
          </div>
        </div>
      </div>
    </header>

    <!-- 基本情報 -->
    <section class="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="border-b border-slate-100 px-6 py-3">
        <h2 class="text-sm font-semibold text-slate-700">基本情報</h2>
      </div>
      <dl class="divide-y divide-slate-100">
        <div class="flex items-center justify-between px-6 py-3">
          <dt class="text-sm text-slate-500">スタッフID</dt>
          <dd class="font-mono text-sm font-medium text-slate-800">{{ staff?.id }}</dd>
        </div>
        <div class="flex items-center justify-between px-6 py-3">
          <dt class="text-sm text-slate-500">雇用形態</dt>
          <dd>
            <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
              :class="staff?.employmentType === 'FULL_TIME' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'">
              {{ staff?.employmentType ? employmentLabel[staff.employmentType] : '—' }}
            </span>
          </dd>
        </div>
        <div class="flex items-center justify-between px-6 py-3">
          <dt class="text-sm text-slate-500">所属店舗</dt>
          <dd class="text-sm font-medium text-slate-800">{{ shopName }}</dd>
        </div>
        <div class="flex items-center justify-between px-6 py-3">
          <dt class="text-sm text-slate-500">在籍状態</dt>
          <dd>
            <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
              :class="staff?.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'">
              {{ staff?.isActive ? '在籍中' : '退職済み' }}
            </span>
          </dd>
        </div>
        <div class="flex items-center justify-between px-6 py-3">
          <dt class="text-sm text-slate-500">登録日</dt>
          <dd class="text-sm text-slate-800">{{ staff?.createdAt ? formatDate(staff.createdAt) : '—' }}</dd>
        </div>
      </dl>
    </section>

    <!-- アルバイト設定（時給） -->
    <section v-if="staff?.employmentType === 'PART_TIME'" class="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="border-b border-slate-100 px-6 py-3">
        <h2 class="text-sm font-semibold text-slate-700">アルバイト設定</h2>
      </div>
      <div class="px-6 py-5">
        <label class="block">
          <span class="mb-1 block text-xs font-medium text-slate-500">時給（円）</span>
          <div class="flex items-center gap-2">
            <input
              v-model.number="settingValue"
              type="number"
              min="0"
              placeholder="例: 1100"
              class="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              @focus="initSettingEdit"
            />
            <span class="text-sm text-slate-500">円 / 時</span>
          </div>
        </label>
        <p class="mt-1 text-xs text-slate-400">現在: {{ staff.part_time_settings?.hourlywage != null ? `${staff.part_time_settings.hourlywage} 円` : '未設定' }}</p>
        <p v-if="settingError" class="mt-2 text-xs text-rose-600">{{ settingError }}</p>
        <button
          class="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          :disabled="settingSaving"
          @click="saveSetting"
        >{{ settingSaving ? '保存中…' : '保存する' }}</button>
      </div>
    </section>

    <!-- 給与累計（アルバイトのみ） -->
    <section v-if="staff?.employmentType === 'PART_TIME' && hourlywage > 0" class="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="flex items-center justify-between border-b border-slate-100 px-6 py-3">
        <h2 class="text-sm font-semibold text-slate-700">給与累計</h2>
        <div class="flex items-center gap-2">
          <button
            class="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100"
            @click="selectedYear--"
          >‹</button>
          <span class="text-sm font-semibold text-slate-700">{{ selectedYear }}年</span>
          <button
            class="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100"
            :disabled="selectedYear >= currentYear"
            @click="selectedYear++"
          >›</button>
        </div>
      </div>

      <!-- サマリー -->
      <div class="grid grid-cols-3 gap-px bg-slate-100 border-b border-slate-100">
        <div class="bg-white px-5 py-4 text-center">
          <p class="text-xs text-slate-400">年間給与</p>
          <p class="mt-1 text-xl font-bold text-slate-800">¥{{ yearlyTotal.toLocaleString() }}</p>
        </div>
        <div class="bg-white px-5 py-4 text-center">
          <p class="text-xs text-slate-400">年間勤務時間</p>
          <p class="mt-1 text-xl font-bold text-slate-800">{{ yearlyHours }} h</p>
        </div>
        <div class="bg-white px-5 py-4 text-center">
          <p class="text-xs text-slate-400">時給</p>
          <p class="mt-1 text-xl font-bold text-slate-800">¥{{ hourlywage.toLocaleString() }}</p>
        </div>
      </div>

      <!-- 月別チャート -->
      <div class="p-5">
        <p class="mb-3 text-xs font-medium text-slate-500">月別給与</p>
        <ClientOnly>
          <EarningsChart :monthly-earnings="monthlyEarnings" />
          <template #fallback>
            <div class="h-48 animate-pulse rounded-xl bg-slate-100" />
          </template>
        </ClientOnly>
      </div>

      <!-- 月別テーブル -->
      <div class="border-t border-slate-100">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th class="px-5 py-2 text-left">月</th>
              <th class="px-5 py-2 text-right">給与</th>
              <th class="px-5 py-2 text-right">勤務時間</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="row in monthlyEarnings.filter(m => m.amount > 0)"
              :key="row.month"
              class="hover:bg-slate-50"
            >
              <td class="px-5 py-2 text-slate-700">{{ Number(row.month.slice(5)) }}月</td>
              <td class="px-5 py-2 text-right font-medium text-slate-800">¥{{ row.amount.toLocaleString() }}</td>
              <td class="px-5 py-2 text-right text-slate-500">
                {{ Math.round(yearShifts.filter(s => s.date.startsWith(row.month))
                  .reduce((sum, s) => sum + shiftHours(s.startTime, s.endTime), 0) * 10) / 10 }} h
              </td>
            </tr>
            <tr v-if="yearlyTotal === 0">
              <td colspan="3" class="px-5 py-6 text-center text-sm text-slate-400">
                {{ selectedYear }}年の確定シフトはありません
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <p v-else-if="staff?.employmentType === 'PART_TIME' && hourlywage === 0" class="mt-4 text-center text-xs text-slate-400">
      時給を設定すると給与累計が表示されます
    </p>

  </div>
</template>
