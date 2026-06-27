import { serverSupabaseClient } from '#supabase/server'

/**
 * 店舗詳細＋所属スタッフ取得API
 * GET /api/shops/:shopId
 */
export default defineEventHandler(async (event) => {
  const shopId = getRouterParam(event, 'shopId')
  if (!shopId) {
    throw createError({ statusCode: 400, statusMessage: 'shopId が必要です' })
  }

  const client = await serverSupabaseClient(event)

  const { data: shop, error: shopError } = await client
    .from('shops')
    .select('id, name, createdAt')
    .eq('id', shopId)
    .maybeSingle()

  if (shopError) {
    throw createError({ statusCode: 500, statusMessage: shopError.message })
  }
  if (!shop) {
    throw createError({ statusCode: 404, statusMessage: '店舗が見つかりません' })
  }

  const { data: staff, error: staffError } = await client
    .from('users')
    .select('id, name, employmentType, role')
    .eq('primaryShopId', shopId)
    .order('employmentType', { ascending: true })
    .order('name', { ascending: true })

  if (staffError) {
    throw createError({ statusCode: 500, statusMessage: staffError.message })
  }

  return { shop, staff: staff ?? [] }
})
