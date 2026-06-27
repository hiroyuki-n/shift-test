import { serverSupabaseClient } from '#supabase/server'
import { hashPassword } from '~~/server/utils/password'

/**
 * スタッフ 新規作成API
 * POST /api/staff
 *   body: { name, password, employmentType: 'PART_TIME' | 'FULL_TIME', primaryShopId }
 *
 * users への登録に加え、shop_memberships（メイン所属）も作成する。
 * パスワードは PBKDF2 でハッシュ化して保存する。
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    name?: string
    password?: string
    employmentType?: string
    primaryShopId?: string
  }>(event)

  const name = (body?.name ?? '').trim()
  const password = body?.password ?? ''
  const employmentType = body?.employmentType === 'FULL_TIME' ? 'FULL_TIME' : 'PART_TIME'
  const primaryShopId = body?.primaryShopId

  if (!name || !password || !primaryShopId) {
    throw createError({ statusCode: 400, statusMessage: '氏名・パスワード・所属店舗は必須です' })
  }

  const client = await serverSupabaseClient(event)
  const now = new Date().toISOString()
  const passwordHash = await hashPassword(password)

  const { data, error } = await client
    .from('users')
    .insert({
      name,
      passwordHash,
      role: 'STAFF',
      employmentType,
      primaryShopId,
      updatedAt: now,
    })
    .select('id, name, employmentType, role')
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  const { error: membershipError } = await client
    .from('shop_memberships')
    .insert({
      userId: data.id,
      shopId: primaryShopId,
      type: 'PRIMARY',
    })

  if (membershipError) {
    throw createError({ statusCode: 500, statusMessage: membershipError.message })
  }

  return data
})
