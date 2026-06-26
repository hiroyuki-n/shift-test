import { serverSupabaseClient } from '#supabase/server'

/**
 * スタッフ 新規作成API
 * POST /api/staff
 *   body: { name, email, employmentType: 'PART_TIME' | 'FULL_TIME', primaryShopId }
 *
 * users への登録に加え、shop_memberships（メイン所属）も作成する。
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    name?: string
    email?: string
    employmentType?: string
    primaryShopId?: string
  }>(event)

  const name = (body?.name ?? '').trim()
  const email = (body?.email ?? '').trim()
  const employmentType = body?.employmentType === 'FULL_TIME' ? 'FULL_TIME' : 'PART_TIME'
  const primaryShopId = body?.primaryShopId

  if (!name || !email || !primaryShopId) {
    throw createError({ statusCode: 400, statusMessage: '氏名・メール・所属店舗は必須です' })
  }

  const client = await serverSupabaseClient(event)
  const userId = crypto.randomUUID()
  const now = new Date().toISOString()

  const { data, error } = await client
    .from('users')
    .insert({
      id: userId,
      name,
      email,
      role: 'STAFF',
      employmentType,
      primaryShopId,
      updatedAt: now,
    })
    .select('id, name, email, employmentType, role')
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  const { error: membershipError } = await client
    .from('shop_memberships')
    .insert({
      id: crypto.randomUUID(),
      userId,
      shopId: primaryShopId,
      type: 'PRIMARY',
    })

  if (membershipError) {
    throw createError({ statusCode: 500, statusMessage: membershipError.message })
  }

  return data
})
