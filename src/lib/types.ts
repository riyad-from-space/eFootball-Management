// Shared types that are NOT server actions (a 'use server' file may only export
// async functions, so result types live here instead).

export type ActionResult = { ok: true } | { ok: false; error: string }
