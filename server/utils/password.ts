import { Buffer } from 'node:buffer'

/**
 * パスワードのハッシュ化・照合（Web Crypto / PBKDF2）
 *
 * Cloudflare Workers でも Node でも動作するよう Web Crypto API を使用する。
 * 保存形式: pbkdf2$<iterations>$<saltBase64>$<hashBase64>
 */

// Cloudflare Workers の Web Crypto は PBKDF2 の反復回数を 100,000 までに制限している
// （超えると "Pbkdf2 failed: iteration counts above 100000 are not supported" で失敗する）。
// ハッシュは pbkdf2$<iterations>$... と自己記述形式のため、保存済みハッシュも同じ上限内である必要がある。
const ITERATIONS = 100_000
const KEY_BYTES = 32

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    KEY_BYTES * 8,
  )
  return new Uint8Array(bits)
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derive(password, salt, ITERATIONS)
  return `pbkdf2$${ITERATIONS}$${Buffer.from(salt).toString('base64')}$${Buffer.from(hash).toString('base64')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false

  const iterations = Number(parts[1])
  const salt = new Uint8Array(Buffer.from(parts[2], 'base64'))
  const expected = new Uint8Array(Buffer.from(parts[3], 'base64'))
  const actual = await derive(password, salt, iterations)

  if (actual.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < actual.length; i++) {
    diff |= actual[i] ^ expected[i]
  }
  return diff === 0
}
