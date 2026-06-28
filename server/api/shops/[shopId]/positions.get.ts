import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const shopId = getRouterParam(event, 'shopId')
  if (!shopId) throw createError({ statusCode: 400, statusMessage: 'shopId が必要です' })

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('shop_positions')
    .select('id, name, color, sortOrder')
    .eq('shopId', shopId)
    .order('sortOrder', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data ?? []
})
