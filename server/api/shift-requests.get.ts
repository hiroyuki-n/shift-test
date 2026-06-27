import { serverSupabaseClient } from '#supabase/server'

/**
 * 希望シフト一覧取得API
 * GET /api/shift-requests?userId=...
 */
export default defineEventHandler(async (event) => {
  const { userId, shopId, month, date } = getQuery(event) as { userId?: string; shopId?: string; month?: string; date?: string }
  if (!userId && !shopId) return []

  const client = await serverSupabaseClient(event)

  let query = client
    .from('shift_requests')
    .select('id, date, startTime, endTime, status, note, userId, shopId, users(name, employmentType)')
    .order('date', { ascending: true })

  if (userId) query = query.eq('userId', userId)
  if (shopId) query = query.eq('shopId', shopId)

  if (date) {
    query = query.eq('date', date)
  } else if (month) {
    const [y, m] = month.split('-').map(Number)
    query = query
      .gte('date', `${month}-01`)
      .lte('date', `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`)
  }

  const { data, error } = await query
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data ?? []
})
