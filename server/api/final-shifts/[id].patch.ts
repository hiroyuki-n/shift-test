import { serverSupabaseClient } from '#supabase/server'

/**
 * 確定シフト 更新API
 * PATCH /api/final-shifts/:id
 *   body: { positionId?: number }
 */
export default defineEventHandler(async (event) => {
  const id   = getRouterParam(event, 'id')
  const body = await readBody<{ positionId?: number | null }>(event)

  if (!id) throw createError({ statusCode: 400, statusMessage: 'id が必要です' })

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  if (body.positionId !== undefined) updates.positionId = body.positionId

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('final_shifts')
    .update(updates)
    .eq('id', id)
    .select('id, date, startTime, endTime, positionId, userId, shopId')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
