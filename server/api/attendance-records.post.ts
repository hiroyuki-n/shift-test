import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    date?: string
    userId?: number
    shopId?: number | string
    startTime?: string
    endTime?: string
    breakMinutes?: number | null
    overtimeMinutes?: number | null
    note?: string | null
  }>(event)

  const { date, userId, shopId, startTime, endTime } = body
  if (!date || !userId || !shopId || !startTime || !endTime) {
    throw createError({ statusCode: 400, statusMessage: '必須項目が不足しています' })
  }

  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('attendance_records')
    .insert({
      date,
      userId,
      shopId,
      startTime: new Date(`${date}T${startTime}:00+09:00`).toISOString(),
      endTime:   new Date(`${date}T${endTime}:00+09:00`).toISOString(),
      breakMinutes:    body.breakMinutes    ?? null,
      overtimeMinutes: body.overtimeMinutes ?? null,
      note:            (body.note ?? '').trim() || null,
      updatedAt:       new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
