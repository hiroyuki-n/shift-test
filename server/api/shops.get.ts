import { serverSupabaseClient } from '#supabase/server'

/**
 * 店舗一覧取得API（Supabase版・Cloudflare Workers対応）
 * GET /api/shops
 *
 * @nuxtjs/supabase の serverSupabaseClient を使い、HTTP経由(PostgREST)で
 * Supabaseにアクセスする。Cloudflare Workers ランタイムと相性が良い。
 *
 * ※ テーブル名は Prisma の @@map に合わせて "shops"。
 *   RLS を有効化している場合は、ポリシーに沿ったアクセスになる。
 */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('shops')
    .select('id, name, address, createdAt:created_at')
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return data
})
