<script setup lang="ts">
import { PlusIcon, PencilSquareIcon, TrashIcon, CheckIcon, XMarkIcon } from '@heroicons/vue/24/outline'

definePageMeta({ layout: 'shop' })
useHead({ title: 'ポジション管理' })

interface Position {
  id: number
  name: string
  sortOrder: number
}

const route  = useRoute()
const shopId = route.params.shopId as string

const { data: positions, refresh } = await useFetch<Position[]>(
  `/api/shops/${shopId}/positions`,
  { default: () => [] },
)

// --- 追加 ---
const showForm = ref(false)
const newName  = ref('')
const adding   = ref(false)
const addError = ref('')

async function addPosition() {
  if (!newName.value.trim()) return
  adding.value = true; addError.value = ''
  try {
    await $fetch(`/api/shops/${shopId}/positions`, {
      method: 'POST',
      body: { name: newName.value.trim() },
    })
    newName.value = ''; showForm.value = false
    await refresh()
  } catch (e: unknown) {
    addError.value = (e as { statusMessage?: string })?.statusMessage ?? '追加に失敗しました'
  } finally { adding.value = false }
}

// --- 編集 ---
const editingId  = ref<number | null>(null)
const editName   = ref('')
const editSaving = ref(false)

function startEdit(pos: Position) {
  editingId.value = pos.id
  editName.value  = pos.name
}
function cancelEdit() { editingId.value = null }

async function saveEdit() {
  if (!editingId.value || !editName.value.trim()) return
  editSaving.value = true
  try {
    await $fetch(`/api/shops/${shopId}/positions/${editingId.value}`, {
      method: 'PATCH',
      body: { name: editName.value.trim() },
    })
    editingId.value = null
    await refresh()
  } finally { editSaving.value = false }
}

// --- 削除 ---
const deletingId = ref<number | null>(null)

async function deletePosition(id: number, name: string) {
  if (!confirm(`「${name}」を削除しますか？`)) return
  deletingId.value = id
  try {
    await $fetch(`/api/shops/${shopId}/positions/${id}`, { method: 'DELETE' })
    await refresh()
  } finally { deletingId.value = null }
}
</script>

<template>
  <div class="mx-auto max-w-xl p-8">

    <header class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-slate-800">ポジション管理</h1>
        <p class="mt-0.5 text-sm text-slate-500">{{ positions.length }} 件登録</p>
      </div>
      <button
        class="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        @click="showForm = !showForm"
      >
        <PlusIcon class="h-4 w-4" />追加
      </button>
    </header>

    <!-- 追加フォーム -->
    <section v-if="showForm" class="mb-6 rounded-xl border border-brand/30 bg-white p-5 shadow-sm">
      <form class="flex gap-3" @submit.prevent="addPosition">
        <input
          v-model="newName"
          type="text"
          placeholder="例: フロア"
          required
          class="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <button
          type="submit"
          :disabled="adding || !newName.trim()"
          class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >{{ adding ? '追加中…' : '追加' }}</button>
        <button
          type="button"
          class="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          @click="showForm = false"
        >取消</button>
      </form>
      <p v-if="addError" class="mt-2 text-xs text-rose-600">{{ addError }}</p>
    </section>

    <!-- ポジション一覧 -->
    <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
      <p v-if="positions.length === 0" class="px-6 py-10 text-center text-sm text-slate-400">
        ポジションが登録されていません
      </p>
      <ul v-else class="divide-y divide-slate-100">
        <li v-for="pos in positions" :key="pos.id" class="px-5 py-3">

          <!-- 表示モード -->
          <div v-if="editingId !== pos.id" class="flex items-center justify-between">
            <span class="font-medium text-slate-800">{{ pos.name }}</span>
            <div class="flex gap-2">
              <button
                class="rounded-lg border border-slate-300 p-1.5 text-slate-500 hover:bg-slate-100"
                @click="startEdit(pos)"
              ><PencilSquareIcon class="h-4 w-4" /></button>
              <button
                class="rounded-lg border border-rose-300 p-1.5 text-rose-500 hover:bg-rose-50 disabled:opacity-50"
                :disabled="deletingId === pos.id"
                @click="deletePosition(pos.id, pos.name)"
              ><TrashIcon class="h-4 w-4" /></button>
            </div>
          </div>

          <!-- 編集モード -->
          <div v-else class="flex gap-2">
            <input
              v-model="editName"
              type="text"
              class="flex-1 rounded-lg border border-brand px-3 py-1.5 text-sm focus:outline-none"
              @keydown.enter="saveEdit"
              @keydown.esc="cancelEdit"
            />
            <button
              class="flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              :disabled="editSaving"
              @click="saveEdit"
            ><CheckIcon class="h-3.5 w-3.5" />保存</button>
            <button
              class="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
              @click="cancelEdit"
            ><XMarkIcon class="h-3.5 w-3.5" />取消</button>
          </div>

        </li>
      </ul>
    </section>

  </div>
</template>
