import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const client = await serverSupabaseClient(event)

  const { error } = await client
    .from('attendance_records')
    .delete()
    .eq('id', id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ok: true }
})
