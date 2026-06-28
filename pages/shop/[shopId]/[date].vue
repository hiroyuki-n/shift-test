<script setup lang="ts">
import { CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/vue/24/outline";

type ShiftStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

interface FinalShift {
  id: number
  date: string
  startTime: string
  endTime: string
  positionId: number | null
  userId: number
  shopId: number
  users: { name: string; employmentType: 'PART_TIME' | 'FULL_TIME' | null } | null
  shop_positions: { name: string } | null
}

interface ShiftRequest {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  status: ShiftStatus;
  note: string | null;
  userId: number;
  shopId: number;
  users: { name: string; employmentType: "PART_TIME" | "FULL_TIME" | null } | null;
}

interface ShopDetail {
  shop: { id: number; name: string };
}

definePageMeta({
  layout: "shop",
  validate: (route) => /^\d{4}-\d{2}-\d{2}$/.test(String(route.params.date)),
});

const route = useRoute();
const shopId = route.params.shopId as string;
const date = route.params.date as string;

const { data: shopData } = await useFetch<ShopDetail>(`/api/shops/${shopId}`)

// --- ポジション ---
interface ShopPosition { id: number; name: string }
const { data: shopPositions } = await useFetch<ShopPosition[]>(
  `/api/shops/${shopId}/positions`,
  { default: () => [] },
)
// リクエストごとの選択ポジション（requestId → positionId）
const positionMap = ref<Record<number, number>>({})

const { data: shifts, refresh: refreshShifts } = await useFetch<FinalShift[]>("/api/final-shifts", {
  query: { shopId, date },
  default: () => [],
});

const { data: requests, refresh: refreshRequests } = await useFetch<ShiftRequest[]>("/api/shift-requests", {
  query: { shopId, date },
  default: () => [],
});

// ポジションのデフォルト選択（requests と shopPositions が揃ってから実行）
watch(
  [requests, shopPositions],
  () => {
    const defaultId = shopPositions.value[0]?.id
    if (!defaultId) return
    requests.value.forEach(r => {
      if (!positionMap.value[r.id]) positionMap.value[r.id] = defaultId
    })
  },
  { immediate: true },
)

// --- 承認 / 却下 ---
const STATUS_CONFIG: Record<ShiftStatus, { label: string; badge: string }> = {
  PENDING: { label: "保留", badge: "bg-amber-100 text-amber-700" },
  APPROVED: { label: "入れる", badge: "bg-emerald-100 text-emerald-700" },
  REJECTED: { label: "外す", badge: "bg-rose-100 text-rose-700" },
};

const updatingId = ref<number | null>(null);

async function updateStatus(id: number, status: ShiftStatus) {
  updatingId.value = id;
  try {
    await $fetch(`/api/shift-requests/${id}`, { method: "PATCH", body: { status } });
    timelineMounted.value = false; // アンマウント
    await refreshRequests(); // 最新データ取得
    await nextTick(); // Vue の反映を待つ
    timelineMounted.value = true; // 最新データで再マウント
  } finally {
    updatingId.value = null;
    popupRequest.value = null;
  }
}

// --- リクエストクリックポップアップ ---
const popupRequest = ref<ShiftRequest | null>(null);

function onCalendarRequestClick(id: number) {
  popupRequest.value = requests.value.find((r) => r.id === id) ?? null;
}
function closePopup() {
  popupRequest.value = null;
}

// --- 確定シフトのポジション変更ポップアップ ---
const popupShift     = ref<FinalShift | null>(null)
const popupPosition  = ref<number | null>(null)
const positionSaving = ref(false)

function onCalendarFinalShiftClick(id: number) {
  const shift = shifts.value.find(s => s.id === id) ?? null
  popupShift.value    = shift
  popupPosition.value = shift?.positionId ?? (shopPositions.value[0]?.id ?? null)
}
function closeFinalPopup() { popupShift.value = null }

async function saveFinalShiftPosition() {
  if (!popupShift.value) return
  positionSaving.value = true
  try {
    await $fetch(`/api/final-shifts/${popupShift.value.id}`, {
      method: 'PATCH',
      body: { positionId: popupPosition.value },
    })
    closeFinalPopup()
    timelineMounted.value = false
    await refreshShifts()
    await nextTick()
    timelineMounted.value = true
  } finally { positionSaving.value = false }
}

const pendingCount = computed(() => requests.value.filter((r) => r.status === "PENDING").length);

// タイムライン再マウント制御
const timelineMounted = ref(true);

// APPROVED(入れる) かつ final_shift なし → 確定対象
const unconfirmedRequests = computed(() => requests.value.filter((r) => r.status === "APPROVED" && !shifts.value.some((s) => s.userId === r.userId)));

// 保留が残っているか
const pendingBlockCount = computed(() => requests.value.filter((r) => r.status === "PENDING" && !shifts.value.some((s) => s.userId === r.userId)).length);

// 確定済みか（final_shift が存在する）
const isConfirmed = computed(() => shifts.value.length > 0);

// --- 確定 ---
const confirming     = ref(false)
const confirmError   = ref('')

async function confirmShifts() {
  confirmError.value = ''
  if (unconfirmedRequests.value.length === 0 || pendingBlockCount.value > 0) return
  confirming.value = true
  try {
    await Promise.all(
      unconfirmedRequests.value.map(r =>
        $fetch('/api/final-shifts', {
          method: 'POST',
          body: {
            date:       r.date,
            startTime:  r.startTime,
            endTime:    r.endTime,
            positionId: positionMap.value[r.id] ?? shopPositions.value[0]?.id ?? null,
            userId:     r.userId,
            shopId,
          },
        }),
      ),
    )
    timelineMounted.value = false
    await refreshShifts()
    await nextTick()
    timelineMounted.value = true
  } catch (e: unknown) {
    confirmError.value = (e as { statusMessage?: string })?.statusMessage ?? '確定に失敗しました'
  } finally {
    confirming.value = false
  }
}

// --- 未確定に戻す ---
const undoing = ref(false);

async function undoConfirmation() {
  if (!shifts.value.length) return;
  undoing.value = true;
  try {
    await Promise.all(shifts.value.map((s) => $fetch(`/api/final-shifts/${s.id}`, { method: "DELETE" })));
    timelineMounted.value = false;
    await refreshShifts();
    await nextTick();
    timelineMounted.value = true;
  } finally {
    undoing.value = false;
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const min = (d.getUTCHours() * 60 + d.getUTCMinutes() + 540) % 1440;
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

const dateLabel = computed(() =>
  new Date(`${date}T12:00:00+09:00`).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }),
);
</script>

<template>
  <div class="mx-auto max-w-6xl p-8">
    <!-- ヘッダー -->
    <header class="mb-6">
      <h1 class="mb-1 text-2xl font-bold text-slate-800">{{ dateLabel }}</h1>
      <p v-if="confirmError" class="mb-3 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-600">{{ confirmError }}</p>

      <!-- 確定・アクションボタン（横並び） -->
      <div class="flex gap-3">
        <!-- 左：確定人数（情報表示） -->
        <div class="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold" :class="isConfirmed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'">
          <CheckCircleIcon class="h-5 w-5" />
          <span>確定</span>
          <span class="text-base font-bold">{{ shifts.length }}</span>
          <span class="text-xs font-normal opacity-75">人</span>
        </div>

        <!-- 右：確定済み → 未確定に戻す / 未確定 → 確定する -->
        <template v-if="isConfirmed">
          <button class="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition" :class="undoing ? 'bg-slate-100 text-slate-400' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'" :disabled="undoing" @click="undoConfirmation">
            <ExclamationCircleIcon class="h-5 w-5" />
            {{ undoing ? "解除中…" : "未確定に戻す" }}
          </button>
        </template>
        <template v-else>
          <button
            class="flex flex-1 flex-col items-center justify-center rounded-xl py-3 text-sm font-semibold transition"
            :class="unconfirmedRequests.length > 0 && pendingBlockCount === 0 && !confirming ? 'bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer' : 'bg-slate-100 text-slate-400 cursor-default'"
            :disabled="unconfirmedRequests.length === 0 || pendingBlockCount > 0 || confirming"
            @click="confirmShifts"
          >
            <div class="flex items-center gap-2">
              <CheckCircleIcon class="h-5 w-5" />
              <span>{{ confirming ? "確定中…" : "確定する" }}</span>
            </div>
            <span v-if="pendingBlockCount > 0" class="mt-0.5 text-xs font-normal opacity-80"> 保留 {{ pendingBlockCount }}件を先に処理してください </span>
          </button>
        </template>
      </div>
    </header>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <!-- 左：タイムライン -->
      <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 class="mb-3 text-sm font-semibold text-slate-700">タイムライン</h2>
        <ClientOnly>
          <ShiftTimeline
              v-if="timelineMounted"
              :shifts="shifts"
              :requests="isConfirmed ? [] : requests"
              :date="date"
              @request-click="onCalendarRequestClick"
              @final-shift-click="onCalendarFinalShiftClick"
            />
          <div v-else class="flex h-64 items-center justify-center text-sm text-slate-400">更新中…</div>
          <template #fallback>
            <div class="py-16 text-center text-sm text-slate-400">読み込み中…</div>
          </template>
        </ClientOnly>
      </section>

      <!-- 右：確定済みは確定一覧 / 未確定は申請一覧 -->
      <div class="space-y-4">

        <!-- 確定済み一覧（社員・アルバイト分割） -->
        <template v-if="isConfirmed">

          <!-- 社員 -->
          <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div class="border-b border-slate-100 px-5 py-3">
              <h2 class="text-sm font-semibold text-slate-700">
                社員
                <span class="ml-1.5 font-normal text-slate-400">{{ shifts.filter(s => s.users?.employmentType === 'FULL_TIME').length }}人</span>
              </h2>
            </div>
            <ul class="divide-y divide-slate-100">
              <li
                v-for="s in shifts.filter(s => s.users?.employmentType === 'FULL_TIME').sort((a, b) => (a.users?.name ?? '').localeCompare(b.users?.name ?? ''))"
                :key="s.id"
                class="flex items-center justify-between px-5 py-2.5"
              >
                <span class="text-sm font-medium text-slate-800">{{ s.users?.name ?? '—' }}</span>
                <span class="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">終日</span>
              </li>
              <li v-if="!shifts.some(s => s.users?.employmentType === 'FULL_TIME')" class="px-5 py-4 text-center text-sm text-slate-400">社員のシフトはありません</li>
            </ul>
          </section>

          <!-- アルバイト -->
          <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div class="border-b border-slate-100 px-5 py-3">
              <h2 class="text-sm font-semibold text-slate-700">
                アルバイト
                <span class="ml-1.5 font-normal text-slate-400">{{ shifts.filter(s => s.users?.employmentType !== 'FULL_TIME').length }}人</span>
              </h2>
            </div>
            <ul class="divide-y divide-slate-100">
              <li
                v-for="s in shifts.filter(s => s.users?.employmentType !== 'FULL_TIME').sort((a, b) => a.startTime.localeCompare(b.startTime))"
                :key="s.id"
                class="flex items-center gap-2 px-5 py-2.5"
              >
                <span class="shrink-0 text-xs text-slate-500">{{ formatTime(s.startTime) }}〜{{ formatTime(s.endTime) }}</span>
                <span class="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{{ s.users?.name ?? '—' }}</span>
                <span class="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{{ s.shop_positions?.name ?? '—' }}</span>
              </li>
              <li v-if="!shifts.some(s => s.users?.employmentType !== 'FULL_TIME')" class="px-5 py-4 text-center text-sm text-slate-400">アルバイトのシフトはありません</li>
            </ul>
          </section>

        </template>

        <!-- 申請一覧（未確定時のみ） -->
        <template v-else>
        <!-- 社員 -->
        <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div class="border-b border-slate-100 px-5 py-3">
            <h2 class="text-sm font-semibold text-slate-700">
              社員
              <span class="ml-1.5 font-normal text-slate-400">{{ requests.filter((r) => r.users?.employmentType === "FULL_TIME").length }}人</span>
            </h2>
          </div>
          <ul class="divide-y divide-slate-100">
            <li
              v-for="req in [...requests].filter(r => r.users?.employmentType === 'FULL_TIME').sort((a, b) => (a.users?.name ?? '').localeCompare(b.users?.name ?? ''))"
              :key="req.id"
              class="flex items-center gap-2 px-5 py-2.5"
            >
              <span class="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{{ req.users?.name ?? '—' }}</span>
              <select
                v-model="positionMap[req.id]"
                class="rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-brand focus:outline-none"
              >
                <option v-for="p in shopPositions" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
              <div class="flex shrink-0 gap-1">
                <button
                  v-for="(cfg, key) in STATUS_CONFIG" :key="key"
                  class="rounded-full px-2 py-0.5 text-xs font-semibold transition"
                  :class="req.status === key ? cfg.badge : 'bg-slate-100 text-slate-300 hover:text-slate-500'"
                  :disabled="updatingId === req.id"
                  @click="updateStatus(req.id, key as ShiftStatus)"
                >{{ cfg.label }}</button>
              </div>
            </li>
            <li v-if="!requests.some((r) => r.users?.employmentType === 'FULL_TIME')" class="px-5 py-4 text-center text-sm text-slate-400">社員の希望はありません</li>
          </ul>
        </section>

        <!-- アルバイト -->
        <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div class="border-b border-slate-100 px-5 py-3">
            <h2 class="text-sm font-semibold text-slate-700">
              アルバイト
              <span class="ml-1.5 font-normal text-slate-400">{{ requests.filter((r) => r.users?.employmentType !== "FULL_TIME").length }}人</span>
            </h2>
          </div>
          <ul class="divide-y divide-slate-100">
            <li
              v-for="req in [...requests].filter(r => r.users?.employmentType !== 'FULL_TIME').sort((a, b) => a.startTime.localeCompare(b.startTime))"
              :key="req.id"
              class="flex items-center gap-2 px-5 py-2.5"
            >
              <span class="shrink-0 text-xs text-slate-500">{{ formatTime(req.startTime) }}〜{{ formatTime(req.endTime) }}</span>
              <span class="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{{ req.users?.name ?? '—' }}</span>
              <select
                v-model="positionMap[req.id]"
                class="rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-brand focus:outline-none"
              >
                <option v-for="p in shopPositions" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
              <div class="flex shrink-0 gap-1">
                <button
                  v-for="(cfg, key) in STATUS_CONFIG" :key="key"
                  class="rounded-full px-2 py-0.5 text-xs font-semibold transition"
                  :class="req.status === key ? cfg.badge : 'bg-slate-100 text-slate-300 hover:text-slate-500'"
                  :disabled="updatingId === req.id"
                  @click="updateStatus(req.id, key as ShiftStatus)"
                >{{ cfg.label }}</button>
              </div>
            </li>
            <li v-if="!requests.some((r) => r.users?.employmentType !== 'FULL_TIME')" class="px-5 py-4 text-center text-sm text-slate-400">アルバイトの希望はありません</li>
          </ul>
        </section>
        </template>

      </div>
    </div>

    <!-- 確定シフト ポジション変更ポップアップ -->
    <Teleport to="body">
      <div
        v-if="popupShift"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
        @click.self="closeFinalPopup"
      >
        <div class="w-full max-w-xs rounded-xl bg-white shadow-xl">
          <div class="border-b border-slate-100 px-5 py-4">
            <p class="font-semibold text-slate-800">{{ popupShift.users?.name ?? '—' }}</p>
            <p class="mt-0.5 text-sm text-slate-500">
              {{ popupShift.users?.employmentType === 'FULL_TIME' ? '終日' : `${formatTime(popupShift.startTime)}〜${formatTime(popupShift.endTime)}` }}
            </p>
          </div>
          <div class="p-4">
            <label class="mb-4 block">
              <span class="mb-1 block text-xs font-medium text-slate-600">ポジション</span>
              <select
                v-model="popupPosition"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              >
                <option v-for="p in shopPositions" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </label>
            <div class="flex gap-2">
              <button
                class="flex-1 rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
                :disabled="positionSaving"
                @click="saveFinalShiftPosition"
              >{{ positionSaving ? '保存中…' : '保存する' }}</button>
              <button
                class="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                @click="closeFinalPopup"
              >キャンセル</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- カレンダークリック ポップアップ -->
    <Teleport to="body">
      <div v-if="popupRequest" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" @click.self="closePopup">
        <div class="w-full max-w-xs rounded-xl bg-white shadow-xl">
          <div class="border-b border-slate-100 px-5 py-4">
            <p class="font-semibold text-slate-800">{{ popupRequest.users?.name ?? "—" }}</p>
            <p class="mt-0.5 text-sm text-slate-500">{{ formatTime(popupRequest.startTime) }}〜{{ formatTime(popupRequest.endTime) }}</p>
            <span class="mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="STATUS_CONFIG[popupRequest.status].badge">{{ STATUS_CONFIG[popupRequest.status].label }}</span>
          </div>
          <div class="p-4">
            <!-- ポジション選択 -->
            <div v-if="shopPositions.length > 0" class="mb-3">
              <select
                v-model="positionMap[popupRequest.id]"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              >
                <option v-for="p in shopPositions" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>
            <!-- ステータスボタン -->
            <div class="mb-3 flex gap-2">
              <button
                v-for="(cfg, key) in STATUS_CONFIG"
                :key="key"
                class="flex-1 rounded-lg py-2 text-sm font-semibold transition disabled:opacity-50"
                :class="popupRequest.status === key ? cfg.badge + ' ring-2 ring-offset-1 ring-current' : 'bg-slate-100 text-slate-400 hover:text-slate-600'"
                :disabled="updatingId === popupRequest.id"
                @click="updateStatus(popupRequest.id, key as ShiftStatus)"
              >{{ cfg.label }}</button>
            </div>
            <button class="w-full rounded-lg py-2 text-sm text-slate-400 hover:text-slate-600" @click="closePopup">キャンセル</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
