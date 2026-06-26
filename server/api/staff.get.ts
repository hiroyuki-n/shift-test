import { serverSupabaseClient } from '#supabase/server'

/**
 * スタッフ一覧取得API（STAFF ロールのユーザー）
 * GET /api/staff
 *
 * 認証導入前の暫定として、スタッフ画面の「閲覧スタッフ選択」に使用する。
 */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('users')
    .select('id, name, email, employmentType, role, primaryShopId')
    .eq('role', 'STAFF')
    .order('name', { ascending: true })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return data ?? []
})
