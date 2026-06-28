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
    <p v-if="pending" class="py-10 text-center text-sm text-slate-400">読み込み中…</p>
    <p v-else-if="shops.length === 0" class="py-10 text-center text-sm text-slate-400">
      店舗がまだ登録されていません
    </p>
    <ul v-else class="space-y-3">
      <li v-for="shop in shops" :key="shop.id">
        <NuxtLink
          :to="`/admin/shops/${shop.id}`"
          class="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-brand hover:shadow-md"
        >
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
              <BuildingStorefrontIcon class="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <p class="font-semibold text-slate-800">{{ shop.name }}</p>
              <p class="mt-0.5 text-xs text-slate-400">
                {{ shop.staffCount }} 名 ・ {{ formatDate(shop.createdAt) }}
              </p>
            </div>
          </div>
          <ArrowRightIcon class="h-4 w-4 shrink-0 text-slate-300" />
        </NuxtLink>
      </li>
    </ul>

  </div>
</template>
