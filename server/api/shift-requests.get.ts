import { serverSupabaseClient } from '#supabase/server'

/**
 * 希望シフト一覧取得API
 * GET /api/shift-requests?userId=...
 */
export default defineEventHandler(async (event) => {
  const { userId } = getQuery(event) as { userId?: string }
  if (!userId) return []

  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('shift_requests')
    .select('id, date, startTime, endTime, status, note, shopId')
    .eq('userId', userId)
    .order('date', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return data ?? []
})
