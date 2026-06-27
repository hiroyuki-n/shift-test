import { serverSupabaseClient } from '#supabase/server'

/**
 * 確定シフト 作成API
 * POST /api/final-shifts
 *   body: { date, startTime, endTime, position, userId, shopId }
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    date?: string
    startTime?: string
    endTime?: string
    position?: string
    userId?: number
    shopId?: number | string
  }>(event)

  const { date, startTime, endTime, position, userId, shopId } = body

  if (!date || !startTime || !endTime || !position || !userId || !shopId) {
    throw createError({ statusCode: 400, statusMessage: '必須項目が不足しています' })
  }

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('final_shifts')
    .insert({
      date,
      startTime,
      endTime,
      position,
      userId,
      shopId,
      updatedAt: new Date().toISOString(),
    })
    .select('id, date, startTime, endTime, position, userId, shopId')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
