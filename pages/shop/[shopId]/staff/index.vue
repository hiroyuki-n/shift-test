<script setup lang="ts">
import { UserPlusIcon, ArrowRightEndOnRectangleIcon } from '@heroicons/vue/24/outline'
definePageMeta({ layout: 'shop' })

type EmploymentType = 'PART_TIME' | 'FULL_TIME'

interface Staff {
  id: number
  name: string
  employmentType: EmploymentType | null
  role: string
}

interface ShopDetail {
  shop: { id: number; name: string; createdAt: string }
  staff: Staff[]
}

const route  = useRoute()
const shopId = computed(() => route.params.shopId as string)

const { data, refresh } = await useFetch<ShopDetail>(
  () => `/api/shops/${shopId.value}`,
)

const employmentLabel: Record<EmploymentType, string> = {
  PART_TIME: 'アルバイト',
  FULL_TIME: '社員',
}

// --- スタッフ追加フォーム ---
const showForm      = ref(false)
const submitting    = ref(false)
const formError     = ref('')
const newStaff = reactive<{ name: string; password: string; employmentType: EmploymentType }>({
  name: '',
  password: '',
  employmentType: 'PART_TIME',
})

async function addStaff() {
  if (!newStaff.name.trim() || !newStaff.password) return
  submitting.value = true
  formError.value  = ''
  try {
    await $fetch('/api/staff', {
      method: 'POST',
      body: {
        name:           newStaff.name.trim(),
        password:       newStaff.password,
        employmentType: newStaff.employmentType,
        primaryShopId:  shopId.value,
      },
    })
    newStaff.name           = ''
    newStaff.password       = ''
    newStaff.employmentType = 'PART_TIME'
    showForm.value          = false
    await refresh()
  } catch (e: unknown) {
    formError.value = (e as { statusMessage?: string })?.statusMessage ?? 'スタッフの追加に失敗しました'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl p-8">

    <header class="mb-6 flex items-center justify-between">
      <h1 class="text-xl font-bold text-slate-800">スタッフ一覧</h1>
      <button
        class="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        @click="showForm = !showForm"
      >
        <UserPlusIcon class="h-4 w-4" />スタッフを追加
      </button>
    </header>

    <!-- 追加フォーム -->
    <section v-if="showForm" class="mb-6 rounded-xl border border-brand/30 bg-white p-6 shadow-sm">
      <h2 class="mb-4 text-sm font-semibold text-slate-700">新規スタッフ登録</h2>
      <form class="grid grid-cols-1 gap-4 sm:grid-cols-3" @submit.prevent="addStaff">
        <label class="block">
          <span class="mb-1 block text-xs font-medium text-slate-600">氏名</span>
          <input
            v-model="newStaff.name"
            type="text"
            required
            placeholder="例: 山田 太郎"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-medium text-slate-600">初期パスワード</span>
          <input
            v-model="newStaff.password"
            type="password"
            required
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-medium text-slate-600">雇用形態</span>
          <select
            v-model="newStaff.employmentType"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="PART_TIME">アルバイト</option>
            <option value="FULL_TIME">社員</option>
          </select>
        </label>
        <p v-if="formError" class="text-xs text-rose-600 sm:col-span-3">{{ formError }}</p>
        <div class="flex gap-2 sm:col-span-3">
          <button
            type="submit"
            :disabled="submitting"
            class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {{ submitting ? '登録中…' : '登録する' }}
          </button>
          <button
            type="button"
            class="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            @click="showForm = false"
          >
            キャンセル
          </button>
        </div>
      </form>
    </section>

    <!-- スタッフ一覧 -->
    <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="border-b border-slate-100 px-6 py-4">
        <p class="text-sm text-slate-500">{{ data?.staff?.length ?? 0 }} 名登録</p>
      </div>

      <p v-if="!data?.staff?.length" class="px-6 py-12 text-center text-sm text-slate-400">
        スタッフがまだ登録されていません
      </p>

      <table v-else class="w-full text-left text-sm">
        <thead class="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th class="px-6 py-3">ID</th>
            <th class="px-6 py-3">氏名</th>
            <th class="px-6 py-3">雇用形態</th>
            <th class="px-6 py-3 text-right">ログインページ</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr
            v-for="staff in data?.staff" :key="staff.id"
            class="cursor-pointer hover:bg-slate-50"
            @click="navigateTo(`/shop/${shopId}/staff/${staff.id}`)"
          >
            <td class="px-6 py-4 font-mono text-xs text-slate-400">{{ staff.id }}</td>
            <td class="px-6 py-4">
              <span class="font-medium text-slate-800 hover:text-brand">{{ staff.name }}</span>
            </td>
            <td class="px-6 py-4">
              <span
                class="rounded-full px-2.5 py-0.5 text-xs font-medium"
                :class="staff.employmentType === 'FULL_TIME'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-slate-100 text-slate-600'"
              >
                {{ staff.employmentType ? employmentLabel[staff.employmentType] : '—' }}
              </span>
            </td>
            <td class="px-6 py-4 text-right" @click.stop>
              <NuxtLink
                :to="`/login/${staff.id}`"
                class="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
              >
                <ArrowRightEndOnRectangleIcon class="h-4 w-4" />/login/{{ staff.id }}
              </NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

  </div>
</template>
