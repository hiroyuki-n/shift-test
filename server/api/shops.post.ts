import { serverSupabaseClient } from '#supabase/server'

/**
 * 店舗 新規作成API
 * POST /api/shops  body: { name: string, address?: string }
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ name?: string; address?: string }>(event)
  const name = (body?.name ?? '').trim()
  const address = (body?.address ?? '').trim() || null

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: '店舗名は必須です' })
  }

  const client = await serverSupabaseClient(event)

  // id / updatedAt は DB 側にデフォルトが無いため明示的に付与する
  const { data, error } = await client
    .from('shops')
    .insert({
      id: crypto.randomUUID(),
      name,
      address,
      updatedAt: new Date().toISOString(),
    })
    .select('id, name, address, createdAt')
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { ...data, staffCount: 0 }
})
