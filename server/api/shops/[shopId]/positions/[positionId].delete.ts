import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const positionId = getRouterParam(event, 'positionId')
  if (!positionId) throw createError({ statusCode: 400, statusMessage: 'positionId が必要です' })

  const client = await serverSupabaseClient(event)
  const { error } = await client
    .from('shop_positions')
    .delete()
    .eq('id', positionId)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true }
})
