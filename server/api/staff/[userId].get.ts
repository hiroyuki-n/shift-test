import { serverSupabaseClient } from '#supabase/server'

/**
 * スタッフ単体取得API（ログイン画面の氏名表示用）
 * GET /api/staff/:userId
 */
export default defineEventHandler(async (event) => {
  const userId = getRouterParam(event, 'userId')
  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'userId が必要です' })
  }

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('users')
    .select('id, name, role, employmentType, isActive, primaryShopId, createdAt, updatedAt')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'スタッフが見つかりません' })
  }

  return data
})
