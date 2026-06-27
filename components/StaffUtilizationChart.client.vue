<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Tooltip,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

interface StaffStat {
  name: string
  employmentType: string | null
  workedDays: number
  totalHours: number
  rate: number
}

const props = defineProps<{ stats: StaffStat[]; daysInMonth: number }>()

const chartData = computed(() => ({
  labels: props.stats.map(s => s.name),
  datasets: [
    {
      label: '勤務時間（h）',
      data: props.stats.map(s => s.totalHours),
      backgroundColor: props.stats.map(s =>
        s.employmentType === 'FULL_TIME' ? '#818cf8' : '#6ee7b7',
      ),
      borderRadius: 6,
      maxBarThickness: 32,
    },
  ],
}))

const chartOptions = {
  indexAxis: 'y' as const,
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: { raw: unknown; dataIndex: number }) => {
          const s = props.stats[ctx.dataIndex]
          return ` ${ctx.raw}h（${s.workedDays}日）`
        },
      },
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      ticks: { callback: (v: unknown) => `${v}h`, font: { size: 11 } },
      grid: { color: '#f1f5f9' },
    },
    y: { ticks: { font: { size: 12 } }, grid: { display: false } },
  },
}
</script>

<template>
  <div :style="{ height: `${Math.max(stats.length * 44 + 20, 120)}px` }">
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>
