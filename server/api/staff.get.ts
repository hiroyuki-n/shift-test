import { serverSupabaseClient } from '#supabase/server'

/**
 * スタッフ一覧取得API（STAFF ロール）
 * GET /api/staff
 */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)

  // スタッフ基本情報
  const { data: users, error } = await client
    .from('users')
    .select('id, name, employmentType, primaryShopId, createdAt')
    .order('id', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!users?.length) return []

  // 設定テーブルを別取得してマージ
  const userIds = users.map(u => u.id)

  const [{ data: ftSettings }, { data: ptSettings }] = await Promise.all([
    client.from('full_time_settings').select('userId').in('userId', userIds),
    client.from('part_time_settings').select('userId, hourlywage').in('userId', userIds),
  ])

  const ftMap = new Map((ftSettings ?? []).map(s => [s.userId, s]))
  const ptMap = new Map((ptSettings ?? []).map(s => [s.userId, s]))

  return users.map(u => ({
    ...u,
    full_time_settings: ftMap.get(u.id) ?? null,
    part_time_settings: ptMap.get(u.id) ?? null,
  }))
})
