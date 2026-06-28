import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const positionId = getRouterParam(event, 'positionId')
  const body = await readBody<{ name?: string }>(event)

  if (!positionId || !body?.name?.trim())
    throw createError({ statusCode: 400, statusMessage: 'positionId と名前は必須です' })

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('shop_positions')
    .update({ name: body.name.trim() })
    .eq('id', positionId)
    .select('id, name, sortOrder')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
