<script setup lang="ts">
import FullCalendar from '@fullcalendar/vue3'
import timeGridPlugin from '@fullcalendar/timegrid'
import jaLocale from '@fullcalendar/core/locales/ja'
import type { EventInput, EventContentArg } from '@fullcalendar/core'

type Position    = 'HALL' | 'KITCHEN' | 'CASHIER' | 'MANAGER' | 'OTHER'
type ShiftStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

interface Shift {
  id: number; startTime: string; endTime: string
  position: Position; users: { name: string } | null
}
interface Request {
  id: number; startTime: string; endTime: string
  status: ShiftStatus; users: { name: string } | null
}

const props = defineProps<{ shifts: Shift[]; requests?: Request[]; date: string }>()

const emit = defineEmits<{
  requestClick: [id: number, status: ShiftStatus]
}>()

// --- 色設定 ---
const positionLabel: Record<Position, string> = {
  HALL: 'ホール', KITCHEN: 'キッチン', CASHIER: 'レジ', MANAGER: '管理', OTHER: 'その他',
}
const positionColors: Record<Position, { bg: string; border: string; text: string }> = {
  HALL:    { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  KITCHEN: { bg: '#ffedd5', border: '#f97316', text: '#9a3412' },
  CASHIER: { bg: '#dcfce7', border: '#22c55e', text: '#166534' },
  MANAGER: { bg: '#f3e8ff', border: '#a855f7', text: '#6b21a8' },
  OTHER:   { bg: '#f1f5f9', border: '#94a3b8', text: '#475569' },
}
// 色付き（入れる）とグレー（保留）の2色
type RequestColorConfig = { bg: string; border: string; text: string; dashed: boolean } | null
const requestColors: Record<ShiftStatus, RequestColorConfig> = {
  PENDING:  { bg: '#f1f5f9', border: '#94a3b8', text: '#64748b', dashed: true  }, // グレー
  APPROVED: { bg: '#dbeafe', border: '#6366f1', text: '#3730a3', dashed: false }, // 色付き（インディゴ）
  REJECTED: null, // 外す → 非表示
}

// --- events 構築 ---
function buildEvents(): EventInput[] {
  return [
    ...props.shifts.map(s => ({
      id:              `final-${s.id}`,
      title:           s.users?.name ?? '—',
      start:           s.startTime,
      end:             s.endTime,
      backgroundColor: positionColors[s.position].bg,
      borderColor:     positionColors[s.position].border,
      textColor:       positionColors[s.position].text,
      extendedProps:   { type: 'final' },
    })),
    ...(props.requests ?? []).flatMap(r => {
      const c = requestColors[r.status]
      if (!c) return []
      return [{
        id:              `req-${r.id}`,
        title:           r.users?.name ?? '—',
        start:           r.startTime,
        end:             r.endTime,
        backgroundColor: c.bg,
        borderColor:     c.border,
        textColor:       c.text,
        extendedProps:   { type: 'request', status: r.status, requestId: r.id, dashed: c.dashed },
      }]
    }),
  ]
}

// 親の v-if により常に最新の props で初期化されるため computed 不要だが、
// props へのリアクティブ参照を明示するため computed のまま維持
const calendarOptions = computed(() => ({
  plugins:           [timeGridPlugin],
  initialView:       'timeGridDay',
  initialDate:       props.date,
  locale:            jaLocale,
  headerToolbar:     false,
  allDaySlot:        false,
  slotMinTime:       '08:00:00',
  slotMaxTime:       '22:00:00',
  slotDuration:      '00:30:00',
  slotLabelInterval: '01:00:00',
  height:            'auto',
  nowIndicator:      true,
  events:            buildEvents(),
  eventContent:      renderEventContent,
  eventClick:        handleEventClick,
  eventCursor:       'pointer',
  slotLabelFormat:   { hour: '2-digit', minute: '2-digit', hour12: false },
}))

// --- イベント描画 ---
function renderEventContent(arg: EventContentArg) {
  const dashed = arg.event.extendedProps.dashed === true
  return {
    html: `
      <div style="
        padding: 2px 4px; overflow: hidden; height: 100%; font-size: 11px; line-height: 1.4;
        border-left: 3px ${dashed ? 'dashed' : 'solid'} ${arg.event.borderColor};
      ">
        <div style="font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${arg.event.title}
        </div>
        <div style="opacity:0.8;">${arg.timeText}</div>
      </div>`,
  }
}

// --- クリックハンドラー ---
function handleEventClick(info: { event: { extendedProps: Record<string, unknown> } }) {
  const { type, requestId, status } = info.event.extendedProps
  if (type === 'request') {
    emit('requestClick', requestId as number, status as ShiftStatus)
  }
}
</script>

<template>
  <FullCalendar :options="calendarOptions" />
</template>
