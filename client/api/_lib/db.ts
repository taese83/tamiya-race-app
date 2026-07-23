import {neon} from '@neondatabase/serverless'

/**
 * Neon HTTP driver. serverless 환경에서 cold-start 없이 sql\`...\` 태그로 쿼리.
 * DATABASE_URL을 우선 사용, 없으면 POSTGRES_URL fallback.
 */
let cachedSql: ReturnType<typeof neon> | null = null

export function sql() {
  if (cachedSql) return cachedSql
  const url = process.env['DATABASE_URL'] ?? process.env['POSTGRES_URL']
  if (!url) throw new Error('DATABASE_URL 미설정')
  cachedSql = neon(url)
  return cachedSql
}

/** 사용자 upsert (로그인 시 호출) */
export async function upsertUser(user: {
  id: string
  email: string
  name: string
  picture?: string | undefined
}): Promise<void> {
  const q = sql()
  await q`
    INSERT INTO users (id, email, name, picture)
    VALUES (${user.id}, ${user.email}, ${user.name}, ${user.picture ?? null})
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      picture = EXCLUDED.picture,
      updated_at = NOW()
  `
}

export interface ParticipationRow {
  race_id: string
  wr_id: string
  rank: number | null
}

export async function getParticipations(userId: string): Promise<ParticipationRow[]> {
  const q = sql()
  const rows = await q`
    SELECT race_id, wr_id, rank FROM participations WHERE user_id = ${userId}
  ` as unknown as ParticipationRow[]
  return rows
}

export async function upsertParticipation(
  userId: string,
  raceId: string,
  wrId: string,
  rank: number | null,
): Promise<void> {
  const q = sql()
  await q`
    INSERT INTO participations (user_id, race_id, wr_id, rank)
    VALUES (${userId}, ${raceId}, ${wrId}, ${rank})
    ON CONFLICT (user_id, race_id) DO UPDATE SET
      rank = EXCLUDED.rank,
      wr_id = EXCLUDED.wr_id,
      updated_at = NOW()
  `
}

export async function deleteParticipation(userId: string, raceId: string): Promise<void> {
  const q = sql()
  await q`DELETE FROM participations WHERE user_id = ${userId} AND race_id = ${raceId}`
}

export async function getManualScore(userId: string): Promise<number> {
  const q = sql()
  const rows = await q`SELECT points FROM manual_scores WHERE user_id = ${userId}` as unknown as Array<{points: number}>
  return rows[0]?.points ?? 0
}

export async function setManualScore(userId: string, points: number): Promise<void> {
  const q = sql()
  await q`
    INSERT INTO manual_scores (user_id, points)
    VALUES (${userId}, ${points})
    ON CONFLICT (user_id) DO UPDATE SET
      points = EXCLUDED.points,
      updated_at = NOW()
  `
}
