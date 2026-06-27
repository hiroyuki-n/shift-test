import { serverSupabaseClient } from '#supabase/server'

/**
 * 確定シフト一覧取得API
 * GET /api/final-shifts?userId=...          → スタッフ本人のシフト（shops.name付き）
 * GET /api/final-shifts?shopId=...&month=YYYY-MM → 店舗の月別シフト（users.name付き）
 */
export default defineEventHandler(async (event) => {
  const { userId, shopId, month, date } = getQuery(event) as {
    userId?: string
    shopId?: string
    month?: string
    date?: string
  }

  if (!userId && !shopId) return []

  const client = await serverSupabaseClient(event)

  let query = client
    .from('final_shifts')
    .select('id, date, startTime, endTime, position, userId, shopId, users!final_shifts_userId_fkey(name), shops(name)')
    .order('date', { ascending: true })
    .order('startTime', { ascending: true })

  if (userId) query = query.eq('userId', userId)
  if (shopId) query = query.eq('shopId', shopId)

  if (date) {
    query = query.eq('date', date)
  } else if (month) {
    const [y, m] = month.split('-').map(Number)
    const startDate = `${month}-01`
    const endDate = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
    query = query.gte('date', startDate).lte('date', endDate)
  }

  const { data, error } = await query

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return data ?? []
})
