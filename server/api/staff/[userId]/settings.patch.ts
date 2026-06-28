import { serverSupabaseClient } from '#supabase/server'

/**
 * スタッフ設定 更新API
 * PATCH /api/staff/:userId/settings
 *   body: { hourlywage?: number }  ← アルバイトのみ
 */
export default defineEventHandler(async (event) => {
  const userId = getRouterParam(event, 'userId')
  const body   = await readBody<{ hourlywage?: number }>(event)

  if (!userId) throw createError({ statusCode: 400, statusMessage: 'userId が必要です' })

  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('part_time_settings')
    .upsert({ userId: Number(userId), hourlywage: body.hourlywage })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
