<script setup lang="ts">
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'

definePageMeta({ layout: 'admin' })

type EmploymentType = 'PART_TIME' | 'FULL_TIME'

interface StaffInfo {
  id: number
  name: string
  role: string
  employmentType: EmploymentType | null
  isActive: boolean
  primaryShopId: number | null
  createdAt: string
  updatedAt: string
  full_time_settings: { workpattern: string | null } | null
  part_time_settings: { hourlywage: number | null } | null
}

interface Shop { id: number; name: string }

const route  = useRoute()
const userId = route.params.userId as string

const { data: staff, refresh: refreshStaff } = await useFetch<StaffInfo>(`/api/staff/${userId}`)
const { data: shops } = await useFetch<Shop[]>('/api/shops', { default: () => [] })

// --- 雇用形態の変更 ---
const editingEmployment = ref(false)
const newEmploymentType = ref<EmploymentType | ''>('')
const saving            = ref(false)
const saveError         = ref('')

function startEdit() {
  newEmploymentType.value = staff.value?.employmentType ?? ''
  editingEmployment.value = true
  saveError.value = ''
}
function cancelEdit() { editingEmployment.value = false }

async function saveEmploymentType() {
  if (!newEmploymentType.value) return
  saving.value = true; saveError.value = ''
  try {
    await $fetch(`/api/staff/${userId}`, {
      method: 'PATCH',
      body: { employmentType: newEmploymentType.value },
    })
    await refreshStaff()
    editingEmployment.value = false
  } catch (e: unknown) {
    saveError.value = (e as { statusMessage?: string })?.statusMessage ?? '更新に失敗しました'
  } finally { saving.value = false }
}

// --- 設定の編集 ---
const settingValue  = ref<string | number | null>(null)
const settingSaving = ref(false)
const settingError  = ref('')

function initSettingEdit() {
  if (staff.value?.employmentType === 'FULL_TIME') {
    settingValue.value = staff.value.full_time_settings?.workpattern ?? ''
  } else {
    settingValue.value = staff.value?.part_time_settings?.hourlywage ?? null
  }
  settingError.value = ''
}

async function saveSetting() {
  settingSaving.value = true; settingError.value = ''
  try {
    const body = staff.value?.employmentType === 'FULL_TIME'
      ? { workpattern: settingValue.value as string }
      : { hourlywage: Number(settingValue.value) }
    await $fetch(`/api/staff/${userId}/settings`, { method: 'PATCH', body })
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

const employmentLabel: Record<EmploymentType, string> = {
  PART_TIME: 'アルバイト',
  FULL_TIME: '社員',
}

const roleLabel: Record<string, string> = {
  SUPER_ADMIN: '本社管理者', SHOP_ADMIN: '店長', STAFF: 'スタッフ',
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
      <NuxtLink to="/admin/staff" class="mb-3 inline-flex items-center gap-1 text-xs text-slate-400 hover:underline">
        <ArrowLeftIcon class="h-3.5 w-3.5" />スタッフ一覧へ戻る
      </NuxtLink>
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
        <NuxtLink :to="`/login/${userId}`"
          class="rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand transition hover:bg-brand hover:text-white"
        >ログインページ</NuxtLink>
      </div>
    </header>

    <!-- 基本情報 -->
    <section class="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="border-b border-slate-100 px-6 py-3">
        <h2 class="text-sm font-semibold text-slate-700">基本情報</h2>
      </div>
      <dl class="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-3">
        <div class="bg-white px-5 py-4">
          <dt class="text-xs text-slate-400">スタッフID</dt>
          <dd class="mt-1 font-mono text-sm font-semibold text-slate-800">{{ staff?.id }}</dd>
        </div>
        <div class="bg-white px-5 py-4">
          <dt class="mb-1 text-xs text-slate-400">雇用形態</dt>
          <dd>
            <div v-if="!editingEmployment" class="flex items-center gap-2">
              <span class="text-sm font-semibold text-slate-800">
                {{ staff?.employmentType ? employmentLabel[staff.employmentType] : '—' }}
              </span>
              <button class="text-xs text-brand hover:underline" @click="startEdit">変更</button>
            </div>
            <div v-else class="space-y-1.5">
              <select v-model="newEmploymentType" class="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-brand focus:outline-none">
                <option value="PART_TIME">アルバイト</option>
                <option value="FULL_TIME">社員</option>
              </select>
              <p v-if="saveError" class="text-xs text-rose-600">{{ saveError }}</p>
              <div class="flex gap-1">
                <button class="rounded-lg bg-brand px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-50" :disabled="saving" @click="saveEmploymentType">{{ saving ? '保存中…' : '保存' }}</button>
                <button class="rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-50" @click="cancelEdit">取消</button>
              </div>
            </div>
          </dd>
        </div>
        <div class="bg-white px-5 py-4">
          <dt class="text-xs text-slate-400">権限</dt>
          <dd class="mt-1 text-sm font-semibold text-slate-800">{{ staff?.role ? roleLabel[staff.role] ?? staff.role : '—' }}</dd>
        </div>
        <div class="bg-white px-5 py-4">
          <dt class="text-xs text-slate-400">所属店舗</dt>
          <dd class="mt-1 text-sm text-slate-800">{{ shopName }}</dd>
        </div>
        <div class="bg-white px-5 py-4">
          <dt class="text-xs text-slate-400">在籍状態</dt>
          <dd class="mt-1">
            <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
              :class="staff?.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'">
              {{ staff?.isActive ? '在籍中' : '退職済み' }}
            </span>
          </dd>
        </div>
        <div class="bg-white px-5 py-4">
          <dt class="text-xs text-slate-400">登録日</dt>
          <dd class="mt-1 text-sm text-slate-800">{{ staff?.createdAt ? formatDate(staff.createdAt) : '—' }}</dd>
        </div>
      </dl>
    </section>

    <!-- 雇用形態別設定 -->
    <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="border-b border-slate-100 px-6 py-3">
        <h2 class="text-sm font-semibold text-slate-700">
          {{ staff?.employmentType === 'FULL_TIME' ? '社員設定' : 'アルバイト設定' }}
        </h2>
      </div>
      <div class="px-6 py-5">

        <!-- アルバイト：時給 -->
        <template v-if="staff?.employmentType === 'PART_TIME'">
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
        </template>

        <!-- 社員：勤務パターン -->
        <template v-else-if="staff?.employmentType === 'FULL_TIME'">
          <label class="block">
            <span class="mb-1 block text-xs font-medium text-slate-500">勤務パターン</span>
            <input
              v-model="settingValue"
              type="text"
              placeholder="例: 9:00〜18:00 / 週5日"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              @focus="initSettingEdit"
            />
          </label>
          <p class="mt-1 text-xs text-slate-400">現在: {{ staff.full_time_settings?.workpattern ?? '未設定' }}</p>
        </template>

        <p v-if="settingError" class="mt-2 text-xs text-rose-600">{{ settingError }}</p>
        <button
          class="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          :disabled="settingSaving"
          @click="saveSetting"
        >{{ settingSaving ? '保存中…' : '保存する' }}</button>
      </div>
    </section>

  </div>
</template>
