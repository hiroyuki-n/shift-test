import { serverSupabaseClient } from '#supabase/server'

/**
 * 希望シフト 提出API
 * POST /api/shift-requests
 *   body: { userId, date: 'YYYY-MM-DD', startTime: 'HH:mm', endTime: 'HH:mm', note?, shopId? }
 *
 * shopId 未指定の場合はユーザーのメイン店舗を使用する。
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    userId?: string
    date?: string
    startTime?: string
    endTime?: string
    note?: string
    shopId?: string
  }>(event)

  const userId = body?.userId
  const date = body?.date
  const startTime = body?.startTime
  const endTime = body?.endTime
  const note = (body?.note ?? '').trim() || null

  if (!userId || !date || !startTime || !endTime) {
    throw createError({ statusCode: 400, statusMessage: '必須項目（スタッフ・日付・時間）が不足しています' })
  }

  const client = await serverSupabaseClient(event)

  let shopId = body?.shopId
  if (!shopId) {
    const { data: user } = await client
      .from('users')
      .select('primaryShopId')
      .eq('id', userId)
      .maybeSingle()
    shopId = user?.primaryShopId ?? undefined
  }
  if (!shopId) {
    throw createError({ statusCode: 400, statusMessage: '所属店舗が特定できません' })
  }

  const now = new Date().toISOString()
  const { data, error } = await client
    .from('shift_requests')
    .insert({
      id: crypto.randomUUID(),
      date,
      startTime: new Date(`${date}T${startTime}:00`).toISOString(),
      endTime: new Date(`${date}T${endTime}:00`).toISOString(),
      status: 'PENDING',
      note,
      userId,
      shopId,
      updatedAt: now,
    })
    .select('id, date, startTime, endTime, status, note, shopId')
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return data
})
