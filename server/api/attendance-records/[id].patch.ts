import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<{
    date?: string
    startTime?: string
    endTime?: string
    breakMinutes?: number | null
    overtimeMinutes?: number | null
    isAbsent?: boolean
  }>(event)

  const client = await serverSupabaseClient(event)

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() }

  if (body.startTime && body.date) {
    updates.startTime = new Date(`${body.date}T${body.startTime}:00+09:00`).toISOString()
  }
  if (body.endTime && body.date) {
    updates.endTime = new Date(`${body.date}T${body.endTime}:00+09:00`).toISOString()
  }
  if ('isAbsent' in body) {
    updates.isAbsent = body.isAbsent ?? false
    if (body.isAbsent) {
      updates.startTime = null
      updates.endTime   = null
      updates.breakMinutes    = null
      updates.overtimeMinutes = null
    }
  }
  if (!body.isAbsent && 'breakMinutes'    in body) updates.breakMinutes    = body.breakMinutes    ?? null
  if (!body.isAbsent && 'overtimeMinutes' in body) updates.overtimeMinutes = body.overtimeMinutes ?? null

  const { error } = await client
    .from('attendance_records')
    .update(updates)
    .eq('id', id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ok: true }
})
