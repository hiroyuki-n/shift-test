<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const props = defineProps<{
  months: string[]
  shops: { id: number; name: string }[]
  costByShopMonth: Record<number, Record<string, number>>
}>()

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#0ea5e9']

const chartData = computed(() => ({
  labels: props.months.map(m => {
    const [, mo] = m.split('-')
    return `${Number(mo)}月`
  }),
  datasets: props.shops.map((shop, i) => ({
    label: shop.name,
    data: props.months.map(m => props.costByShopMonth[shop.id]?.[m] ?? 0),
    backgroundColor: COLORS[i % COLORS.length],
    borderRadius: 4,
    maxBarThickness: 48,
  })),
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'bottom' as const,
      labels: { font: { size: 11 }, boxWidth: 12, padding: 16 },
    },
    tooltip: {
      callbacks: {
        label: (ctx: { dataset: { label: string }; raw: unknown }) =>
          ` ${ctx.dataset.label}: ¥${Number(ctx.raw).toLocaleString()}`,
      },
    },
  },
  scales: {
    x: { stacked: true, grid: { display: false }, ticks: { font: { size: 11 } } },
    y: {
      stacked: true,
      beginAtZero: true,
      ticks: {
        callback: (v: unknown) => `¥${Number(v).toLocaleString()}`,
        font: { size: 11 },
      },
      grid: { color: '#f1f5f9' },
    },
  },
}
</script>

<template>
  <div class="h-64">
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>
