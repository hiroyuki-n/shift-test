import { serverSupabaseClient } from '#supabase/server'
import { getSessionUserId } from '~~/server/utils/session'

/**
 * ログイン中ユーザー取得API
 * GET /api/auth/me  → 未ログインなら null
 */
export default defineEventHandler(async (event) => {
  const userId = getSessionUserId(event)
  if (!userId) return null

  const client = await serverSupabaseClient(event)
  const { data: user, error } = await client
    .from('users')
    .select('id, name, role, employmentType, primaryShopId')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return user ?? null
})
