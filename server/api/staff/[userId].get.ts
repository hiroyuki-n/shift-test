import { serverSupabaseClient } from '#supabase/server'

/**
 * スタッフ単体取得API
 * GET /api/staff/:userId
 * employmentType に応じた設定テーブルも含めて返す
 */
export default defineEventHandler(async (event) => {
  const userId = getRouterParam(event, 'userId')
  if (!userId) throw createError({ statusCode: 400, statusMessage: 'userId が必要です' })

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('users')
    .select(`
      id, name, role, employmentType, isActive, primaryShopId, createdAt, updatedAt,
      full_time_settings(workpattern),
      part_time_settings(hourlywage)
    `)
    .eq('id', userId)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!data)  throw createError({ statusCode: 404, statusMessage: 'スタッフが見つかりません' })

  return data
})
