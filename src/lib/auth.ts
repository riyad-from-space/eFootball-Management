import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

// Single-admin auth. The password lives in ADMIN_PASSWORD (env only — never a
// hardcoded fallback). The session cookie is an HMAC-signed token so it cannot
// be forged the way a static "authenticated" string could.

export const SESSION_COOKIE = 'admin_session'
export const SESSION_MAX_AGE = 60 * 60 * 12 // 12 hours (seconds)

function adminPassword(): string | undefined {
  const pw = process.env.ADMIN_PASSWORD
  return pw && pw.length > 0 ? pw : undefined
}

/** The signing secret: a dedicated SESSION_SECRET if set, else the password. */
function secret(): string | undefined {
  return process.env.SESSION_SECRET || adminPassword()
}

export function isAdminConfigured(): boolean {
  return !!adminPassword()
}

function constantTimeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

export function verifyPassword(input: string): boolean {
  const pw = adminPassword()
  if (!pw) return false
  return constantTimeEqual(input, pw)
}

function sign(payload: string, key: string): string {
  return createHmac('sha256', key).update(payload).digest('base64url')
}

/** Build a signed `<issuedAtMs>.<signature>` token. */
export function createSessionToken(): string | null {
  const key = secret()
  if (!key) return null
  const issuedAt = Date.now().toString()
  return `${issuedAt}.${sign(issuedAt, key)}`
}

/** Verify signature and freshness of a session cookie value. */
export function verifySessionToken(token: string | undefined | null): boolean {
  const key = secret()
  if (!key || !token) return false
  const dot = token.lastIndexOf('.')
  if (dot <= 0) return false
  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = sign(payload, key)
  if (!constantTimeEqual(sig, expected)) return false
  const issuedAt = Number(payload)
  if (!Number.isFinite(issuedAt)) return false
  const ageSeconds = (Date.now() - issuedAt) / 1000
  return ageSeconds >= 0 && ageSeconds < SESSION_MAX_AGE
}
