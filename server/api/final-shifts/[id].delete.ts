import { serverSupabaseClient } from '#supabase/server'

/**
 * 確定シフト 削除API
 * DELETE /api/final-shifts/:id
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id が必要です' })

  const client = await serverSupabaseClient(event)
  const { error } = await client
    .from('final_shifts')
    .delete()
    .eq('id', id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true }
})
