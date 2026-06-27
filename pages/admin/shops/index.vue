<script setup lang="ts">
import { PlusIcon, ArrowRightIcon, BuildingStorefrontIcon } from '@heroicons/vue/24/outline'

definePageMeta({ layout: 'admin' })

interface Shop {
  id: number
  name: string
  isActive: boolean
  createdAt: string
  staffCount: number
}

const { data: shops, pending, refresh } = await useFetch<Shop[]>('/api/shops', {
  default: () => [],
})

const showForm   = ref(false)
const newName    = ref('')
const submitting = ref(false)
const formError  = ref('')

async function addShop() {
  if (!newName.value.trim()) return
  submitting.value = true
  formError.value  = ''
  try {
    await $fetch('/api/shops', {
      method: 'POST',
      body: { name: newName.value.trim() },
    })
    newName.value  = ''
    showForm.value = false
    await refresh()
  } catch (e: unknown) {
    formError.value = (e as { statusMessage?: string })?.statusMessage ?? '追加に失敗しました'
  } finally {
    submitting.value = false
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}
</script>

<template>
  <div class="mx-auto max-w-4xl p-8">

    <header class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-slate-800">店舗一覧</h1>
        <p class="mt-0.5 text-sm text-slate-500">{{ shops.length }} 店舗登録済み</p>
      </div>
      <button
        class="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        @click="showForm = !showForm"
      >
        <PlusIcon class="h-4 w-4" />店舗を追加
      </button>
    </header>

    <!-- 追加フォーム -->
    <section v-if="showForm" class="mb-6 rounded-xl border border-brand/30 bg-white p-5 shadow-sm">
      <form class="flex gap-3" @submit.prevent="addShop">
        <input
          v-model="newName"
          type="text"
          required
          placeholder="例: 渋谷店"
          class="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <button
          type="submit"
          :disabled="submitting"
          class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >{{ submitting ? '登録中…' : '登録する' }}</button>
        <button
          type="button"
          class="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          @click="showForm = false"
        >キャンセル</button>
      </form>
      <p v-if="formError" class="mt-2 text-xs text-rose-600">{{ formError }}</p>
    </section>

    <!-- 一覧 -->
    <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
      <p v-if="pending" class="px-6 py-10 text-center text-sm text-slate-400">読み込み中…</p>
      <p v-else-if="shops.length === 0" class="px-6 py-10 text-center text-sm text-slate-400">
        店舗がまだ登録されていません
      </p>
      <table v-else class="w-full text-left text-sm">
        <thead class="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th class="px-6 py-3">店舗名</th>
            <th class="px-6 py-3 text-center">スタッフ数</th>
            <th class="px-6 py-3">登録日</th>
            <th class="px-6 py-3 text-right">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="shop in shops" :key="shop.id" class="hover:bg-slate-50">
            <td class="px-6 py-4">
              <div class="flex items-center gap-2">
                <BuildingStorefrontIcon class="h-4 w-4 text-slate-400" />
                <span class="font-medium text-slate-800">{{ shop.name }}</span>
              </div>
            </td>
            <td class="px-6 py-4 text-center text-slate-600">{{ shop.staffCount }} 名</td>
            <td class="px-6 py-4 text-slate-500">{{ formatDate(shop.createdAt) }}</td>
            <td class="px-6 py-4 text-right">
              <NuxtLink
                :to="`/admin/shops/${shop.id}`"
                class="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
              >
                詳細<ArrowRightIcon class="h-3.5 w-3.5" />
              </NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

  </div>
</template>
