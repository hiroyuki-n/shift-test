import { serverSupabaseClient } from '#supabase/server'

/**
 * スタッフ情報 更新API
 * PATCH /api/staff/:userId
 *   body: { employmentType?: 'PART_TIME' | 'FULL_TIME', isActive?: boolean }
 */
export default defineEventHandler(async (event) => {
  const userId = getRouterParam(event, 'userId')
  const body   = await readBody<{ employmentType?: string; isActive?: boolean }>(event)

  if (!userId) throw createError({ statusCode: 400, statusMessage: 'userId が必要です' })

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  if (body.employmentType !== undefined) updates.employmentType = body.employmentType
  if (body.isActive       !== undefined) updates.isActive       = body.isActive

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select('id, name, role, employmentType, isActive, primaryShopId, createdAt, updatedAt')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
