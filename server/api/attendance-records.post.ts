import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    date?: string
    userId?: number
    shopId?: number | string
    startTime?: string
    endTime?: string
    breakStartTime?: string | null
    breakEndTime?: string | null
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

  const toISO = (t: string) => new Date(`${date}T${t}:00+09:00`).toISOString()

  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('attendance_records')
    .insert({
      date,
      userId,
      shopId,
      startTime:      isAbsent ? null : toISO(startTime!),
      endTime:        isAbsent ? null : toISO(endTime!),
      breakStartTime: isAbsent || !body.breakStartTime ? null : toISO(body.breakStartTime),
      breakEndTime:   isAbsent || !body.breakEndTime   ? null : toISO(body.breakEndTime),
      overtimeMinutes: isAbsent ? null : (body.overtimeMinutes ?? null),
      isAbsent:        isAbsent ?? false,
      updatedAt:       new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
