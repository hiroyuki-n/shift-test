<script setup lang="ts">
/**
 * 店舗ページ（店長用）
 * 対象Role: SHOP_ADMIN
 * - 動的ルートから shopId を取得
 * - 自店舗のシフト管理カレンダー（枠のみ）
 * - スタッフ一覧
 * - スタッフ新規追加フォーム
 *
 * ※ middleware で「ログイン中の SHOP_ADMIN が
 *    この shopId の店長か」を検証する想定。
 */

const route = useRoute()
// 動的ルートパラメータ（pages/shop/[shopId]/index.vue → route.params.shopId）
const shopId = computed(() => route.params.shopId as string)

interface Staff {
  id: string
  name: string
  email: string
  position: string
}

// --- モックデータ（本番では useFetch(`/api/shops/${shopId}/staff`) 等） ---
const staffList = ref<Staff[]>([
  { id: 'u-101', name: '山田 太郎', email: 'yamada@example.com', position: 'ホール' },
  { id: 'u-102', name: '佐藤 花子', email: 'sato@example.com', position: 'キッチン' },
  { id: 'u-103', name: '鈴木 一郎', email: 'suzuki@example.com', position: 'レジ' },
])

// --- カレンダー（枠のみ。当週7日分の雛形） ---
const weekDays = ['月', '火', '水', '木', '金', '土', '日']
const timeSlots = ['09:00', '12:00', '15:00', '18:00', '21:00']

// --- スタッフ追加フォーム ---
const showForm = ref(false)
const newStaff = reactive({ name: '', email: '', position: 'ホール' })
const positions = ['ホール', 'キッチン', 'レジ', '管理', 'その他']

function addStaff() {
  if (!newStaff.name.trim() || !newStaff.email.trim()) return
  staffList.value.push({
    id: `u-${Date.now()}`,
    name: newStaff.name.trim(),
    email: newStaff.email.trim(),
    position: newStaff.position,
  })
  newStaff.name = ''
  newStaff.email = ''
  newStaff.position = 'ホール'
  showForm.value = false
}
</script>

<template>
  <main class="min-h-screen bg-slate-50 p-6">
    <div class="mx-auto max-w-6xl">
      <!-- ヘッダー -->
      <header class="mb-8">
        <p class="text-xs font-semibold uppercase tracking-wider text-brand">SHOP ADMIN</p>
        <h1 class="text-2xl font-bold text-slate-800">店舗管理</h1>
        <p class="mt-1 text-sm text-slate-500">店舗ID: <span class="font-mono">{{ shopId }}</span></p>
      </header>

      <!-- シフトカレンダー（枠のみ） -->
      <section class="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-slate-800">シフトカレンダー（今週）</h2>
          <button class="rounded-lg border border-brand px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand/5">
            シフトを確定する
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-center text-sm">
            <thead>
              <tr>
                <th class="border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500">時間</th>
                <th v-for="day in weekDays" :key="day" class="border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
                  {{ day }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="slot in timeSlots" :key="slot">
                <td class="border border-slate-200 bg-slate-50 px-3 py-3 font-medium text-slate-500">{{ slot }}</td>
                <td
                  v-for="day in weekDays"
                  :key="`${slot}-${day}`"
                  class="h-14 border border-slate-200 align-top transition hover:bg-brand/5"
                >
                  <!-- ここに確定シフト（スタッフ名 + ポジション）を配置する想定 -->
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- スタッフ管理 -->
      <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 class="text-lg font-semibold text-slate-800">スタッフ一覧</h2>
          <button
            class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            @click="showForm = !showForm"
          >
            + スタッフを追加
          </button>
        </div>

        <!-- スタッフ追加フォーム -->
        <form v-if="showForm" class="grid grid-cols-1 gap-4 border-b border-slate-100 p-6 sm:grid-cols-3" @submit.prevent="addStaff">
          <label class="block">
            <span class="mb-1 block text-sm font-medium text-slate-600">氏名</span>
            <input
              v-model="newStaff.name"
              type="text"
              required
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
          <label class="block">
            <span class="mb-1 block text-sm font-medium text-slate-600">メールアドレス</span>
            <input
              v-model="newStaff.email"
              type="email"
              required
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
          <label class="block">
            <span class="mb-1 block text-sm font-medium text-slate-600">ポジション</span>
            <select
              v-model="newStaff.position"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option v-for="p in positions" :key="p" :value="p">{{ p }}</option>
            </select>
          </label>
          <div class="sm:col-span-3">
            <button type="submit" class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
              登録する
            </button>
          </div>
        </form>

        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th class="px-6 py-3">氏名</th>
              <th class="px-6 py-3">メール</th>
              <th class="px-6 py-3">ポジション</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="staff in staffList" :key="staff.id" class="hover:bg-slate-50">
              <td class="px-6 py-4 font-medium text-slate-800">{{ staff.name }}</td>
              <td class="px-6 py-4 text-slate-600">{{ staff.email }}</td>
              <td class="px-6 py-4">
                <span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {{ staff.position }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </main>
</template>
