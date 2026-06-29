import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<{
    date?: string
    startTime?: string
    endTime?: string
    breakStartTime?: string | null
    breakEndTime?: string | null
    overtimeMinutes?: number | null
    isAbsent?: boolean
  }>(event)

  const client = await serverSupabaseClient(event)

  const toISO = (d: string, t: string) => new Date(`${d}T${t}:00+09:00`).toISOString()

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() }

  if ('isAbsent' in body) {
    updates.isAbsent = body.isAbsent ?? false
    if (body.isAbsent) {
      updates.startTime      = null
      updates.endTime        = null
      updates.breakStartTime = null
      updates.breakEndTime   = null
      updates.overtimeMinutes = null
    }
  }

  if (!body.isAbsent && body.date) {
    if (body.startTime) updates.startTime = toISO(body.date, body.startTime)
    if (body.endTime)   updates.endTime   = toISO(body.date, body.endTime)
    updates.breakStartTime = body.breakStartTime ? toISO(body.date, body.breakStartTime) : null
    updates.breakEndTime   = body.breakEndTime   ? toISO(body.date, body.breakEndTime)   : null
    if ('overtimeMinutes' in body) updates.overtimeMinutes = body.overtimeMinutes ?? null
  }

  const { error } = await client
    .from('attendance_records')
    .update(updates)
    .eq('id', id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ok: true }
})
