import { serverSupabaseClient } from '#supabase/server'

/**
 * 確定シフト一覧取得API
 * GET /api/final-shifts?userId=...
 *
 * 店舗名を併せて返す（shops を埋め込み取得）。
 */
export default defineEventHandler(async (event) => {
  const { userId } = getQuery(event) as { userId?: string }
  if (!userId) return []

  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('final_shifts')
    .select('id, date, startTime, endTime, position, shopId, shops(name)')
    .eq('userId', userId)
    .order('date', { ascending: true })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return data ?? []
})
