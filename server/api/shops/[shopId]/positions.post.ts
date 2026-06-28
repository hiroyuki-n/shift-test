import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const shopId = getRouterParam(event, 'shopId')
  const body   = await readBody<{ name?: string }>(event)

  if (!shopId || !body?.name?.trim())
    throw createError({ statusCode: 400, statusMessage: 'shopId と名前は必須です' })

  const client = await serverSupabaseClient(event)

  const { data: existing } = await client
    .from('shop_positions')
    .select('sortOrder')
    .eq('shopId', shopId)
    .order('sortOrder', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await client
    .from('shop_positions')
    .insert({
      shopId:    Number(shopId),
      name:      body.name.trim(),
      sortOrder: (existing?.sortOrder ?? 0) + 1,
    })
    .select('id, name, sortOrder')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
