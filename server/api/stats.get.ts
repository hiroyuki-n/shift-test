import { serverSupabaseClient } from '#supabase/server'

/**
 * ダッシュボード集計API
 * GET /api/stats
 *
 * 現状は承認待ち希望シフト件数のみ。店舗数・スタッフ数は一覧から算出する。
 */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)

  const { count, error } = await client
    .from('shift_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'PENDING')

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { pendingRequests: count ?? 0 }
})
