import { serverSupabaseClient } from '#supabase/server'

/**
 * 希望シフト ステータス更新API
 * PATCH /api/shift-requests/:id
 *   body: { status: 'PENDING' | 'APPROVED' | 'REJECTED' }
 */
export default defineEventHandler(async (event) => {
  const id     = getRouterParam(event, 'id')
  const body   = await readBody<{ status?: string }>(event)
  const status = body?.status

  if (!id || !['PENDING', 'APPROVED', 'REJECTED'].includes(status ?? '')) {
    throw createError({ statusCode: 400, statusMessage: '不正なリクエストです' })
  }

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('shift_requests')
    .update({ status, updatedAt: new Date().toISOString() })
    .eq('id', id)
    .select('id, status')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
