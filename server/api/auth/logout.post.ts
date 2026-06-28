import { clearUserSession } from '~~/server/utils/session'

/**
 * ログアウトAPI
 * POST /api/auth/logout
 */
export default defineEventHandler((event) => {
  clearUserSession(event)
  return { ok: true }
})
