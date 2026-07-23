import {useState} from 'react'
import {
  Box, Button, IconButton, Menu, MenuItem, Select, Stack, Tooltip, Typography,
} from '@mui/material'
import type {SelectChangeEvent} from '@mui/material'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import {useSession, loginWithGoogle} from '@/features/auth'
import {useProfiles} from '../model/useProfiles'
import type {Profile} from '../model/useProfiles'
import {
  useParticipations,
  useUpsertParticipation,
  useDeleteParticipation,
  makeParticipationByRace,
} from '../model/useParticipations'
import type {Participation} from '../model/useParticipations'

interface ParticipationBoxProps {
  raceId: string
  wrId: string
  /** race.date. 현재는 사용하지 않지만 시그니처 유지 (호출부 호환) */
  raceDate?: string
}

export const ParticipationBox = ({raceId, wrId}: ParticipationBoxProps) => {
  const {user} = useSession()
  const {profiles} = useProfiles(user != null)
  const {data: list} = useParticipations(user != null)
  const upsert = useUpsertParticipation()
  const remove = useDeleteParticipation()
  const [addAnchorEl, setAddAnchorEl] = useState<HTMLElement | null>(null)

  const SectionHeader = (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{mb: 0.75}}>
      <EmojiEventsIcon sx={{fontSize: 16, color: 'primary.main'}} />
      <Typography variant="caption" sx={{fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5}}>
        내 참여 기록
      </Typography>
    </Stack>
  )

  if (!user) {
    return (
      <Box>
        {SectionHeader}
        <Typography variant="body2" color="text.secondary" sx={{pl: 3, fontSize: '0.8rem'}}>
          <Box
            component="button"
            onClick={loginWithGoogle}
            sx={{
              background: 'none', border: 'none', p: 0, m: 0,
              color: 'primary.main', cursor: 'pointer', fontSize: 'inherit',
              textDecoration: 'underline',
            }}>
            로그인
          </Box>{' '}
          후 참여를 기록할 수 있습니다.
        </Typography>
      </Box>
    )
  }

  const byRace = makeParticipationByRace(list)
  const perProfile = byRace.get(raceId) ?? new Map<number, Participation>()
  const isSaving = upsert.isPending || remove.isPending

  // 참여한 프로필과 미참여 프로필 분리
  const participatingProfiles = profiles.filter(p => perProfile.has(p.id))
  const availableProfiles = profiles.filter(p => !perProfile.has(p.id))

  const handleAdd = (profileId: number) => {
    setAddAnchorEl(null)
    upsert.mutate({profileId, raceId, wrId, rank: null})
  }

  return (
    <Box>
      {SectionHeader}
      <Stack spacing={0.75} sx={{pl: 3}}>
        {participatingProfiles.map(profile => {
          const current = perProfile.get(profile.id)!
          return (
            <ProfileRow
              key={profile.id}
              profile={profile}
              current={current}
              isSaving={isSaving}
              onRankChange={(nextRank) => {
                upsert.mutate({profileId: profile.id, raceId, wrId, rank: nextRank})
              }}
              onRemove={() => {
                remove.mutate({profileId: profile.id, raceId})
              }}
            />
          )
        })}

        {/* 프로필 추가 버튼 — 프로필 이름 라인과 왼쪽 정렬 맞춤 */}
        {availableProfiles.length > 0 && (
          <>
            <Button
              size="small"
              variant="text"
              startIcon={<AddIcon fontSize="small" />}
              disabled={isSaving}
              onClick={(e) => setAddAnchorEl(e.currentTarget)}
              sx={{
                fontSize: '0.78rem',
                color: 'primary.main',
                alignSelf: 'flex-start',
                minWidth: 0,
                py: 0.25,
                pl: 0,
                '& .MuiButton-startIcon': {ml: 0},
              }}>
              프로필 추가
            </Button>
            <Menu
              anchorEl={addAnchorEl}
              open={Boolean(addAnchorEl)}
              onClose={() => setAddAnchorEl(null)}>
              {availableProfiles.map(p => (
                <MenuItem key={p.id} onClick={() => handleAdd(p.id)} sx={{fontSize: '0.85rem'}}>
                  {p.name}
                  {p.is_default && (
                    <Typography component="span" variant="caption" sx={{ml: 1, color: 'primary.main', fontSize: '0.7rem'}}>
                      기본
                    </Typography>
                  )}
                </MenuItem>
              ))}
            </Menu>
          </>
        )}

        {(upsert.error || remove.error) && (
          <Typography variant="caption" color="error" sx={{fontSize: '0.7rem'}}>
            저장 실패: {(upsert.error ?? remove.error)?.message}
          </Typography>
        )}
      </Stack>
    </Box>
  )
}

interface ProfileRowProps {
  profile: Profile
  current: Participation
  isSaving: boolean
  onRankChange: (rank: number | null) => void
  onRemove: () => void
}

const ProfileRow = ({profile, current, isSaving, onRankChange, onRemove}: ProfileRowProps) => {
  const rank = current.rank ?? null

  return (
    <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>
      <Typography
        variant="body2"
        sx={{fontSize: '0.85rem', fontWeight: 600, minWidth: 60, color: profile.is_default ? 'primary.main' : 'text.primary'}}>
        {profile.name}
      </Typography>
      <Stack direction="row" alignItems="center" spacing={0.75}>
        <Typography variant="body2" sx={{fontSize: '0.85rem'}}>결과</Typography>
        <Select
          size="small"
          value={rank == null ? '' : String(rank)}
          onChange={(e: SelectChangeEvent) => {
            const v = e.target.value
            onRankChange(v === '' ? null : Number(v))
          }}
          disabled={isSaving}
          sx={{minWidth: 90, height: 28, fontSize: '0.78rem'}}
          displayEmpty>
          <MenuItem value=""><em>선택 안 함</em></MenuItem>
          <MenuItem value="1">1등</MenuItem>
          <MenuItem value="2">2등</MenuItem>
          <MenuItem value="3">3등</MenuItem>
        </Select>
      </Stack>
      <Tooltip title="참여 취소">
        <span>
          <IconButton
            size="small"
            color="error"
            disabled={isSaving}
            onClick={onRemove}
            aria-label={`${profile.name} 참여 취소`}
            sx={{ml: 'auto'}}>
            <RemoveIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  )
}
