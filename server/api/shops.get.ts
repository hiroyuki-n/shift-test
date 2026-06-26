import { serverSupabaseClient } from '#supabase/server'

/**
 * 店舗一覧取得API（Supabase版・Cloudflare Workers対応）
 * GET /api/shops
 *
 * 各店舗のメイン所属スタッフ数（staffCount）も併せて返す。
 * ※ テーブル名・カラム名は Prisma の @@map / フィールド名に合わせる（camelCase）。
 */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)

  const { data: shops, error } = await client
    .from('shops')
    .select('id, name, address, createdAt')
    .order('createdAt', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  // 店舗ごとのメイン所属スタッフ数を集計
  const { data: members, error: memberError } = await client
    .from('users')
    .select('primaryShopId')
    .not('primaryShopId', 'is', null)

  if (memberError) {
    throw createError({ statusCode: 500, statusMessage: memberError.message })
  }

  const countByShop = new Map<string, number>()
  for (const m of members ?? []) {
    if (m.primaryShopId) {
      countByShop.set(m.primaryShopId, (countByShop.get(m.primaryShopId) ?? 0) + 1)
    }
  }

  return (shops ?? []).map((shop) => ({
    ...shop,
    staffCount: countByShop.get(shop.id) ?? 0,
  }))
})
