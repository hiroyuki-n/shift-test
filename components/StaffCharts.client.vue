<script setup lang="ts">
import { Doughnut, Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, Title,
} from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title)

type ShiftStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
type Position    = 'HALL' | 'KITCHEN' | 'CASHIER' | 'MANAGER' | 'OTHER'

interface ShiftRequest {
  id: number; date: string; startTime: string; endTime: string
  status: ShiftStatus; shopId: number
}
interface FinalShift {
  id: number; date: string; startTime: string; endTime: string
  position: Position; shopId: number
}

const props = defineProps<{
  requests: ShiftRequest[]
  finalShifts: FinalShift[]
  month: string  // YYYY-MM
}>()

// JST で分に変換
function toJSTMinutes(iso: string) {
  const d = new Date(iso)
  return (d.getUTCHours() * 60 + d.getUTCMinutes() + 540) % 1440
}
function durationHours(startTime: string, endTime: string) {
  return (toJSTMinutes(endTime) - toJSTMinutes(startTime)) / 60
}

// --- ドーナツチャート：希望ステータス内訳 ---
const doughnutData = computed(() => {
  const pending  = props.requests.filter(r => r.status === 'PENDING').length
  const approved = props.requests.filter(r => r.status === 'APPROVED').length
  const rejected = props.requests.filter(r => r.status === 'REJECTED').length
  return {
    labels: ['申請中', '承認済み', '却下'],
    datasets: [{
      data: [pending, approved, rejected],
      backgroundColor: ['#fcd34d', '#93c5fd', '#fca5a5'],
      borderColor:     ['#f59e0b', '#3b82f6', '#f87171'],
      borderWidth: 2,
    }],
  }
})

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' as const, labels: { font: { size: 12 }, padding: 16 } },
    tooltip: {
      callbacks: {
        label: (ctx: { label: string; raw: unknown }) => ` ${ctx.label}: ${ctx.raw} 件`,
      },
    },
  },
}

// --- 棒グラフ：日別勤務時間 ---
const barData = computed(() => {
  const [y, m] = props.month.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const labels: string[] = []
  const hours: number[]  = []

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dayShifts = props.finalShifts.filter(s => s.date === dateStr)
    const total = dayShifts.reduce((sum, s) => sum + durationHours(s.startTime, s.endTime), 0)
    labels.push(String(d))
    hours.push(Math.round(total * 10) / 10)
  }

  return {
    labels,
    datasets: [{
      label: '勤務時間（h）',
      data: hours,
      backgroundColor: '#a5b4fc',
      borderColor: '#6366f1',
      borderWidth: 1,
      borderRadius: 4,
    }],
  }
})

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: { raw: unknown }) => ` ${ctx.raw} 時間`,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { stepSize: 2, font: { size: 11 } },
      grid: { color: '#f1f5f9' },
    },
    x: {
      ticks: { font: { size: 10 } },
      grid: { display: false },
    },
  },
}

const hasRequests   = computed(() => props.requests.length > 0)
const hasFinalShifts = computed(() => props.finalShifts.length > 0)
const totalHours    = computed(() =>
  props.finalShifts.reduce((sum, s) => sum + durationHours(s.startTime, s.endTime), 0),
)
</script>

<template>
  <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">

    <!-- ドーナツチャート -->
    <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-slate-700">希望シフト内訳</h3>
        <span class="text-xs text-slate-400">{{ requests.length }} 件</span>
      </div>
      <div v-if="hasRequests" class="h-52">
        <Doughnut :data="doughnutData" :options="doughnutOptions" />
      </div>
      <div v-else class="flex h-52 items-center justify-center text-sm text-slate-400">
        データがありません
      </div>
    </div>

    <!-- 棒グラフ -->
    <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-slate-700">日別勤務時間</h3>
        <span class="text-xs text-slate-400">合計 {{ Math.round(totalHours * 10) / 10 }} 時間</span>
      </div>
      <div v-if="hasFinalShifts" class="h-52">
        <Bar :data="barData" :options="barOptions" />
      </div>
      <div v-else class="flex h-52 items-center justify-center text-sm text-slate-400">
        データがありません
      </div>
    </div>

  </div>
</template>
