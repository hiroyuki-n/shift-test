import { serverSupabaseClient } from '#supabase/server'

/**
 * スタッフ設定 更新API
 * PATCH /api/staff/:userId/settings
 *   body: { hourlywage?: number }          ← アルバイト
 *       | { workpattern?: string }          ← 社員
 */
export default defineEventHandler(async (event) => {
  const userId = getRouterParam(event, 'userId')
  const body   = await readBody<{ hourlywage?: number; workpattern?: string }>(event)

  if (!userId) throw createError({ statusCode: 400, statusMessage: 'userId が必要です' })

  const client = await serverSupabaseClient(event)

  // employmentType を確認
  const { data: user } = await client
    .from('users')
    .select('employmentType')
    .eq('id', userId)
    .single()

  if (!user) throw createError({ statusCode: 404, statusMessage: 'スタッフが見つかりません' })

  const table   = user.employmentType === 'FULL_TIME' ? 'full_time_settings' : 'part_time_settings'
  const updates = user.employmentType === 'FULL_TIME'
    ? { workpattern: body.workpattern }
    : { hourlywage: body.hourlywage }

  const { data, error } = await client
    .from(table)
    .upsert({ userid: Number(userId), ...updates })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
