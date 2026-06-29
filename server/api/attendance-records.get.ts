import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const { shopId, date, month, userId } = getQuery(event) as {
    shopId?: string; date?: string; month?: string; userId?: string
  }

  const client = await serverSupabaseClient(event)

  let query = client
    .from('attendance_records')
    .select('id, date, userId, shopId, startTime, endTime, breakMinutes, overtimeMinutes, note, updatedAt, users(name, employmentType)')
    .order('date', { ascending: true })

  if (shopId) query = query.eq('shopId', shopId)
  if (userId) query = query.eq('userId', userId)

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
