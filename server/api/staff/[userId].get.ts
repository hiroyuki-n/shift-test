import { serverSupabaseClient } from '#supabase/server'

/**
 * スタッフ単体取得API
 * GET /api/staff/:userId
 */
export default defineEventHandler(async (event) => {
  const userId = getRouterParam(event, 'userId')
  if (!userId) throw createError({ statusCode: 400, statusMessage: 'userId が必要です' })

  const client = await serverSupabaseClient(event)

  const { data: user, error } = await client
    .from('users')
    .select('id, name, role, employmentType, isActive, primaryShopId, createdAt, updatedAt')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!user)  throw createError({ statusCode: 404, statusMessage: 'スタッフが見つかりません' })

  // 設定テーブルを別取得
  const [{ data: ftSettings }, { data: ptSettings }] = await Promise.all([
    client.from('full_time_settings').select('userId, workpattern').eq('userId', userId).maybeSingle(),
    client.from('part_time_settings').select('userId, hourlywage').eq('userId', userId).maybeSingle(),
  ])

  return {
    ...user,
    full_time_settings: ftSettings ?? null,
    part_time_settings: ptSettings ?? null,
  }
})
