<script setup lang="ts">
/**
 * スタッフ別ログインページ
 * /login/:userId
 *
 * URL末尾のスタッフIDからそのスタッフの氏名を表示し、
 * パスワードを入力するとログイン（セッションCookie発行）する。
 */

interface StaffInfo {
  id: string
  name: string
  employmentType: 'PART_TIME' | 'FULL_TIME' | null
}

const route = useRoute()
const userId = computed(() => route.params.userId as string)

const { data: staff, error: fetchError } = await useFetch<StaffInfo>(
  () => `/api/staff/${userId.value}`,
)

const password = ref('')
const submitting = ref(false)
const loginError = ref('')

const employmentLabel: Record<string, string> = {
  PART_TIME: 'アルバイト',
  FULL_TIME: '社員',
}

async function login() {
  if (!password.value) return
  submitting.value = true
  loginError.value = ''
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { userId: userId.value, password: password.value },
    })
    await navigateTo('/staff')
  } catch (e: unknown) {
    loginError.value =
      (e as { statusMessage?: string })?.statusMessage ||
      (e instanceof Error ? e.message : 'ログインに失敗しました')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-slate-50 p-6">
    <div class="w-full max-w-sm">
      <!-- スタッフが見つからない場合 -->
      <div v-if="fetchError" class="rounded-xl border border-rose-200 bg-white p-8 text-center shadow-sm">
        <p class="text-sm text-rose-600">スタッフが見つかりませんでした</p>
        <p class="mt-2 break-all text-xs text-slate-400">ID: {{ userId }}</p>
      </div>

      <!-- ログインフォーム -->
      <div v-else class="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <header class="mb-6 text-center">
          <p class="text-xs font-medium text-slate-400">シフト管理システム</p>
          <h1 class="mt-2 text-xl font-bold text-slate-800">{{ staff?.name }} さん</h1>
          <p v-if="staff?.employmentType" class="mt-1 text-xs text-slate-500">
            {{ employmentLabel[staff.employmentType] }}
          </p>
        </header>

        <form class="space-y-4" @submit.prevent="login">
          <label class="block">
            <span class="mb-1 block text-sm font-medium text-slate-600">パスワード</span>
            <input
              v-model="password"
              type="password"
              required
              autofocus
              placeholder="パスワードを入力"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>

          <p v-if="loginError" class="text-sm text-rose-600">{{ loginError }}</p>

          <button
            type="submit"
            :disabled="submitting"
            class="w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {{ submitting ? 'ログイン中…' : 'ログイン' }}
          </button>
        </form>
      </div>
    </div>
  </main>
</template>
