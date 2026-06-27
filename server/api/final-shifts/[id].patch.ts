import { serverSupabaseClient } from '#supabase/server'

/**
 * 確定シフト 更新API（ポジション・時間変更）
 * PATCH /api/final-shifts/:id
 *   body: { position?, startTime?, endTime? }
 */
export default defineEventHandler(async (event) => {
  const id   = getRouterParam(event, 'id')
  const body = await readBody<{ position?: string; startTime?: string; endTime?: string }>(event)

  if (!id) throw createError({ statusCode: 400, statusMessage: 'id が必要です' })

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  if (body.position)  updates.position  = body.position
  if (body.startTime) updates.startTime = body.startTime
  if (body.endTime)   updates.endTime   = body.endTime

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('final_shifts')
    .update(updates)
    .eq('id', id)
    .select('id, date, startTime, endTime, position, userId, shopId')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
