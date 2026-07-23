import {neon} from '@neondatabase/serverless'

let cachedSql: ReturnType<typeof neon> | null = null

export function sql() {
  if (cachedSql) return cachedSql
  const url = process.env['DATABASE_URL'] ?? process.env['POSTGRES_URL']
  if (!url) throw new Error('DATABASE_URL 미설정')
  cachedSql = neon(url)
  return cachedSql
}

// ─── Users ────────────────────────────────────────────────────

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

// ─── Profiles ─────────────────────────────────────────────────

export interface ProfileRow {
  id: number
  user_id: string
  name: string
  is_default: boolean
}

/** 사용자에게 기본 프로필이 없으면 생성. 로그인 시 호출. */
export async function ensureDefaultProfile(userId: string, name: string): Promise<ProfileRow> {
  const q = sql()
  const existing = await q`
    SELECT id, user_id, name, is_default FROM profiles WHERE user_id = ${userId} AND is_default = TRUE LIMIT 1
  ` as unknown as ProfileRow[]
  if (existing[0]) return existing[0]
  const rows = await q`
    INSERT INTO profiles (user_id, name, is_default)
    VALUES (${userId}, ${name}, TRUE)
    RETURNING id, user_id, name, is_default
  ` as unknown as ProfileRow[]
  return rows[0]!
}

export async function getProfiles(userId: string): Promise<ProfileRow[]> {
  const q = sql()
  const rows = await q`
    SELECT id, user_id, name, is_default FROM profiles
    WHERE user_id = ${userId}
    ORDER BY is_default DESC, id ASC
  ` as unknown as ProfileRow[]
  return rows
}

export async function createProfile(userId: string, name: string): Promise<ProfileRow> {
  const q = sql()
  const rows = await q`
    INSERT INTO profiles (user_id, name, is_default)
    VALUES (${userId}, ${name}, FALSE)
    RETURNING id, user_id, name, is_default
  ` as unknown as ProfileRow[]
  return rows[0]!
}

export async function updateProfile(userId: string, profileId: number, patch: {name?: string; isDefault?: boolean}): Promise<ProfileRow | null> {
  const q = sql()
  if (patch.isDefault === true) {
    // 다른 default 해제 후 이 profile을 default로
    await q`UPDATE profiles SET is_default = FALSE WHERE user_id = ${userId} AND is_default = TRUE`
  }
  const rows = await q`
    UPDATE profiles SET
      name = COALESCE(${patch.name ?? null}, name),
      is_default = COALESCE(${patch.isDefault ?? null}, is_default),
      updated_at = NOW()
    WHERE id = ${profileId} AND user_id = ${userId}
    RETURNING id, user_id, name, is_default
  ` as unknown as ProfileRow[]
  return rows[0] ?? null
}

export async function deleteProfile(userId: string, profileId: number): Promise<{deleted: boolean; reason?: string}> {
  const q = sql()
  const rows = await q`
    SELECT is_default FROM profiles WHERE id = ${profileId} AND user_id = ${userId}
  ` as unknown as Array<{is_default: boolean}>
  if (rows.length === 0) return {deleted: false, reason: 'not_found'}
  if (rows[0]!.is_default) return {deleted: false, reason: 'cannot_delete_default'}
  await q`DELETE FROM profiles WHERE id = ${profileId} AND user_id = ${userId}`
  return {deleted: true}
}

/** profile 소유자 검증 */
export async function assertProfileOwner(userId: string, profileId: number): Promise<boolean> {
  const q = sql()
  const rows = await q`SELECT 1 FROM profiles WHERE id = ${profileId} AND user_id = ${userId}` as unknown as unknown[]
  return rows.length > 0
}

// ─── Participations (profile-based) ───────────────────────────

export interface ParticipationRow {
  profile_id: number
  race_id: string
  wr_id: string
  rank: number | null
  category: string | null
  attended: boolean
}

/** 유저의 모든 프로필의 참여 목록 (프로필 join) */
export async function getParticipationsByUser(userId: string): Promise<ParticipationRow[]> {
  const q = sql()
  const rows = await q`
    SELECT p.profile_id, p.race_id, p.wr_id, p.rank, p.category, p.attended
    FROM participations p
    INNER JOIN profiles pr ON pr.id = p.profile_id
    WHERE pr.user_id = ${userId}
  ` as unknown as ParticipationRow[]
  return rows
}

export async function getParticipationsByProfile(profileId: number): Promise<ParticipationRow[]> {
  const q = sql()
  const rows = await q`
    SELECT profile_id, race_id, wr_id, rank, category, attended FROM participations WHERE profile_id = ${profileId}
  ` as unknown as ParticipationRow[]
  return rows
}

export async function upsertParticipation(
  profileId: number,
  raceId: string,
  wrId: string,
  rank: number | null,
  category: string | null,
  attended: boolean,
): Promise<void> {
  const q = sql()
  await q`
    INSERT INTO participations (profile_id, race_id, wr_id, rank, category, attended)
    VALUES (${profileId}, ${raceId}, ${wrId}, ${rank}, ${category}, ${attended})
    ON CONFLICT (profile_id, race_id) DO UPDATE SET
      rank = EXCLUDED.rank,
      wr_id = EXCLUDED.wr_id,
      category = COALESCE(EXCLUDED.category, participations.category),
      attended = EXCLUDED.attended,
      updated_at = NOW()
  `
}

export async function deleteParticipation(profileId: number, raceId: string): Promise<void> {
  const q = sql()
  await q`DELETE FROM participations WHERE profile_id = ${profileId} AND race_id = ${raceId}`
}

// ─── Manual scores by class ───────────────────────────────────

export interface ManualScoreRow {
  profile_id: number
  class: string
  participate: number
  rank1: number
  rank2: number
  rank3: number
}

export async function getManualScoresByProfile(profileId: number): Promise<ManualScoreRow[]> {
  const q = sql()
  const rows = await q`
    SELECT profile_id, class, participate, rank1, rank2, rank3 FROM manual_scores_by_class WHERE profile_id = ${profileId}
  ` as unknown as ManualScoreRow[]
  return rows
}

export async function getManualScoresByUser(userId: string): Promise<ManualScoreRow[]> {
  const q = sql()
  const rows = await q`
    SELECT m.profile_id, m.class, m.participate, m.rank1, m.rank2, m.rank3 FROM manual_scores_by_class m
    INNER JOIN profiles pr ON pr.id = m.profile_id
    WHERE pr.user_id = ${userId}
  ` as unknown as ManualScoreRow[]
  return rows
}

export async function setManualScore(
  profileId: number,
  cls: string,
  counts: {participate: number; rank1: number; rank2: number; rank3: number},
): Promise<void> {
  const q = sql()
  await q`
    INSERT INTO manual_scores_by_class (profile_id, class, participate, rank1, rank2, rank3, points)
    VALUES (${profileId}, ${cls}, ${counts.participate}, ${counts.rank1}, ${counts.rank2}, ${counts.rank3}, 0)
    ON CONFLICT (profile_id, class) DO UPDATE SET
      participate = EXCLUDED.participate,
      rank1 = EXCLUDED.rank1,
      rank2 = EXCLUDED.rank2,
      rank3 = EXCLUDED.rank3,
      updated_at = NOW()
  `
}
