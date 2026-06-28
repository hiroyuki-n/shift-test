<script setup lang="ts">
import FullCalendar from '@fullcalendar/vue3'
import timeGridPlugin from '@fullcalendar/timegrid'
import jaLocale from '@fullcalendar/core/locales/ja'
import type { EventInput, EventContentArg } from '@fullcalendar/core'

type ShiftStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

interface Shift {
  id: number; startTime: string; endTime: string; date: string
  positionId: number | null
  shop_positions: { name: string } | null
  users: { name: string; employmentType: 'PART_TIME' | 'FULL_TIME' | null } | null
}
interface Request {
  id: number; startTime: string; endTime: string; date: string
  status: ShiftStatus
  users: { name: string; employmentType: 'PART_TIME' | 'FULL_TIME' | null } | null
}

const props = defineProps<{ shifts: Shift[]; requests?: Request[]; date: string }>()

const emit = defineEmits<{
  requestClick: [id: number, status: ShiftStatus]
}>()

// --- 色設定（確定シフト：単一色） ---
const confirmedColor = { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' }
const requestColors: Record<ShiftStatus, { bg: string; border: string; text: string; dashed: boolean } | null> = {
  PENDING:  { bg: '#f1f5f9', border: '#94a3b8', text: '#64748b', dashed: true  },
  APPROVED: { bg: '#dbeafe', border: '#6366f1', text: '#3730a3', dashed: false },
  REJECTED: null,
}

// --- events 構築 ---
function buildEvents(): EventInput[] {
  const events: EventInput[] = []

  for (const s of props.shifts) {
    const isFullTime = s.users?.employmentType === 'FULL_TIME'

    if (isFullTime) {
      // 社員 → 終日行（allDay）
      events.push({
        id:              `final-${s.id}`,
        title:           s.users?.name ?? '—',
        start:           s.date,
        allDay:          true,
        backgroundColor: '#e0e7ff',
        borderColor:     '#6366f1',
        textColor:       '#3730a3',
        extendedProps:   { type: 'final-allday' },
      })
    } else {
      // アルバイト → 時間ブロック
      events.push({
        id:              `final-${s.id}`,
        title:           s.users?.name ?? '—',
        start:           s.startTime,
        end:             s.endTime,
        backgroundColor: confirmedColor.bg,
        borderColor:     confirmedColor.border,
        textColor:       confirmedColor.text,
        extendedProps:   { type: 'final', label: s.shop_positions?.name ?? '' },
      })
    }
  }

  for (const r of (props.requests ?? [])) {
    const c = requestColors[r.status]
    if (!c) continue
    const isFullTime = r.users?.employmentType === 'FULL_TIME'

    if (isFullTime) {
      // 社員リクエスト → 終日行
      events.push({
        id:              `req-${r.id}`,
        title:           r.users?.name ?? '—',
        start:           r.date,
        allDay:          true,
        backgroundColor: c.bg,
        borderColor:     c.border,
        textColor:       c.text,
        extendedProps:   { type: 'request', status: r.status, requestId: r.id, dashed: c.dashed },
      })
    } else {
      // アルバイトリクエスト → 時間ブロック
      events.push({
        id:              `req-${r.id}`,
        title:           r.users?.name ?? '—',
        start:           r.startTime,
        end:             r.endTime,
        backgroundColor: c.bg,
        borderColor:     c.border,
        textColor:       c.text,
        extendedProps:   { type: 'request', status: r.status, requestId: r.id, dashed: c.dashed },
      })
    }
  }

  return events
}

// --- イベント描画 ---
function renderEventContent(arg: EventContentArg) {
  const { type, dashed } = arg.event.extendedProps

  // 社員の終日イベント
  if (type === 'final-allday') {
    return {
      html: `
        <div style="padding:2px 6px; font-size:11px; font-weight:600; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">
          ${arg.event.title}
        </div>`,
    }
  }

  // アルバイト・希望シフト
  const borderStyle = dashed ? 'dashed' : 'solid'
  const label = arg.event.extendedProps.label ?? ''
  return {
    html: `
      <div style="
        padding: 2px 4px; overflow: hidden; height: 100%; font-size: 11px; line-height: 1.4;
        border-left: 3px ${borderStyle} ${arg.event.borderColor};
      ">
        <div style="font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${arg.event.title}
        </div>
        <div style="opacity:0.8;">${arg.timeText}</div>
        ${label ? `<div style="opacity:0.7;">${label}</div>` : ''}
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

const calendarOptions = computed(() => ({
  plugins:           [timeGridPlugin],
  initialView:       'timeGridDay',
  initialDate:       props.date,
  locale:            jaLocale,
  headerToolbar:     false,
  allDaySlot:        true,
  allDayText:        '終日',
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
</script>

<template>
  <FullCalendar :options="calendarOptions" />
</template>
