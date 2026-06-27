import { clearSession } from '~~/server/utils/session'

/**
 * ログアウトAPI
 * POST /api/auth/logout
 */
export default defineEventHandler((event) => {
  clearSession(event)
  return { ok: true }
})
