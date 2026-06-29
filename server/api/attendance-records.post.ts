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
    isAbsent?: boolean
  }>(event)

  const { date, userId, shopId, startTime, endTime, isAbsent } = body
  if (!date || !userId || !shopId) {
    throw createError({ statusCode: 400, statusMessage: '必須項目が不足しています' })
  }
  if (!isAbsent && (!startTime || !endTime)) {
    throw createError({ statusCode: 400, statusMessage: '出退勤時間が不足しています' })
  }

  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('attendance_records')
    .insert({
      date,
      userId,
      shopId,
      startTime: isAbsent ? null : new Date(`${date}T${startTime}:00+09:00`).toISOString(),
      endTime:   isAbsent ? null : new Date(`${date}T${endTime}:00+09:00`).toISOString(),
      breakMinutes:    isAbsent ? null : (body.breakMinutes    ?? null),
      overtimeMinutes: isAbsent ? null : (body.overtimeMinutes ?? null),
      isAbsent:        isAbsent ?? false,
      updatedAt:       new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
