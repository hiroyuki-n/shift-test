import type { H3Event } from 'h3'

/**
 * セッション管理（HttpOnly Cookie にログイン中ユーザーIDを保持）
 *
 * ※ 開発用の簡易セッション。署名・暗号化は行っていないため、
 *    本番運用時はJWT署名や Supabase Auth 等への置き換えを推奨。
 */

const COOKIE_NAME = 'shift_session'
const MAX_AGE = 60 * 60 * 24 * 7 // 7日

export function setSession(event: H3Event, userId: string) {
  setCookie(event, COOKIE_NAME, userId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  })
}

export function getSessionUserId(event: H3Event): string | null {
  return getCookie(event, COOKIE_NAME) || null
}

export function clearSession(event: H3Event) {
  deleteCookie(event, COOKIE_NAME, { path: '/' })
}
