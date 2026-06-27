import { serverSupabaseClient } from '#supabase/server'
import { verifyPassword } from '~~/server/utils/password'
import { setSession } from '~~/server/utils/session'

/**
 * ログインAPI
 * POST /api/auth/login  body: { userId, password }
 *
 * URL末尾のスタッフID + パスワードで認証し、セッションCookieを発行する。
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ userId?: string; password?: string }>(event)
  const userId = body?.userId
  const password = body?.password ?? ''

  if (!userId || !password) {
    throw createError({ statusCode: 400, statusMessage: 'IDとパスワードを入力してください' })
  }

  const client = await serverSupabaseClient(event)
  const { data: user, error } = await client
    .from('users')
    .select('id, name, passwordHash, employmentType, primaryShopId')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
  if (!user || !user.passwordHash) {
    throw createError({ statusCode: 401, statusMessage: 'IDまたはパスワードが正しくありません' })
  }

  const ok = await verifyPassword(password, user.passwordHash)
  if (!ok) {
    throw createError({ statusCode: 401, statusMessage: 'IDまたはパスワードが正しくありません' })
  }

  setSession(event, user.id)

  return {
    id: user.id,
    name: user.name,
    employmentType: user.employmentType,
    primaryShopId: user.primaryShopId,
  }
})
