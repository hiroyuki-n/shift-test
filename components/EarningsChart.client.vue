<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

const props = defineProps<{
  monthlyEarnings: { month: string; amount: number }[]
}>()

const chartData = computed(() => ({
  labels: props.monthlyEarnings.map(m => `${m.month.slice(5)}月`),
  datasets: [{
    label: '給与（円）',
    data: props.monthlyEarnings.map(m => m.amount),
    backgroundColor: '#6ee7b7',
    borderRadius: 6,
    maxBarThickness: 40,
  }],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: { raw: unknown }) => ` ¥${Number(ctx.raw).toLocaleString()}`,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (v: unknown) => `¥${Number(v).toLocaleString()}`,
        font: { size: 11 },
      },
      grid: { color: '#f1f5f9' },
    },
    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
  },
}
</script>

<template>
  <div class="h-48">
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>
