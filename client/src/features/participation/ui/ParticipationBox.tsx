import {useState} from 'react'
import {
  Box, Button, Checkbox, FormControlLabel, IconButton, Menu, MenuItem, Select, Stack, Tooltip, Typography,
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
  raceDate: string
}

/** race.date (YYYY.MM.DD)가 오늘 이후인지. true면 아직 경기 안 시작 (실참여 체크 불가) */
function isBeforeRaceDay(raceDate: string): boolean {
  const [y, m, d] = raceDate.split('.').map(Number)
  if (!y || !m || !d) return false
  const race = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return race.getTime() > today.getTime()
}

export const ParticipationBox = ({raceId, wrId, raceDate}: ParticipationBoxProps) => {
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
  const beforeRace = isBeforeRaceDay(raceDate)
  const isSaving = upsert.isPending || remove.isPending

  const selectedProfiles = profiles.filter(p => perProfile.has(p.id))
  const availableProfiles = profiles.filter(p => !perProfile.has(p.id))

  const handleAdd = (profileId: number) => {
    setAddAnchorEl(null)
    // 프로필 추가 = 선정 (attended=false, rank=null). 언제든지 가능.
    upsert.mutate({profileId, raceId, wrId, rank: null, attended: false})
  }

  return (
    <Box>
      {SectionHeader}
      <Stack spacing={0.75} sx={{pl: 3}}>
        {selectedProfiles.map(profile => {
          const current = perProfile.get(profile.id)!
          return (
            <ProfileRow
              key={profile.id}
              profile={profile}
              current={current}
              beforeRace={beforeRace}
              isSaving={isSaving}
              onAttendedChange={(nextAttended) => {
                upsert.mutate({
                  profileId: profile.id, raceId, wrId,
                  // 실참여 해제 시 rank도 초기화
                  rank: nextAttended ? current.rank : null,
                  attended: nextAttended,
                })
              }}
              onRankChange={(nextRank) => {
                upsert.mutate({
                  profileId: profile.id, raceId, wrId,
                  rank: nextRank,
                  attended: current.attended,
                })
              }}
              onRemove={() => {
                remove.mutate({profileId: profile.id, raceId})
              }}
            />
          )
        })}

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
  beforeRace: boolean
  isSaving: boolean
  onAttendedChange: (attended: boolean) => void
  onRankChange: (rank: number | null) => void
  onRemove: () => void
}

const ProfileRow = ({profile, current, beforeRace, isSaving, onAttendedChange, onRankChange, onRemove}: ProfileRowProps) => {
  const attended = current.attended
  const rank = current.rank
  // 실참여 체크박스는 경기 당일부터, rank Select는 실참여 후에만
  const attendedDisabled = isSaving || beforeRace
  const rankDisabled = isSaving || !attended

  const attendedCheckbox = (
    <FormControlLabel
      control={
        <Checkbox
          size="small"
          checked={attended}
          disabled={attendedDisabled}
          onChange={(_, checked) => onAttendedChange(checked)}
        />
      }
      label={
        <Typography variant="body2" sx={{fontSize: '0.85rem', color: attendedDisabled ? 'text.disabled' : undefined}}>
          참여
        </Typography>
      }
    />
  )

  return (
    <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>
      <Typography
        variant="body2"
        sx={{fontSize: '0.85rem', fontWeight: 600, minWidth: 60, color: profile.is_default ? 'primary.main' : 'text.primary'}}>
        {profile.name}
      </Typography>
      {beforeRace ? (
        <Tooltip title="경기 당일부터 참여 체크가 가능합니다">
          <span>{attendedCheckbox}</span>
        </Tooltip>
      ) : attendedCheckbox}
      <Stack direction="row" alignItems="center" spacing={0.75}>
        <Typography
          variant="body2"
          sx={{fontSize: '0.85rem', color: rankDisabled ? 'text.disabled' : undefined}}>
          결과
        </Typography>
        <Select
          size="small"
          value={rank == null ? '' : String(rank)}
          onChange={(e: SelectChangeEvent) => {
            const v = e.target.value
            onRankChange(v === '' ? null : Number(v))
          }}
          disabled={rankDisabled}
          sx={{minWidth: 90, height: 28, fontSize: '0.78rem'}}
          displayEmpty>
          <MenuItem value=""><em>선택 안 함</em></MenuItem>
          <MenuItem value="1">1등</MenuItem>
          <MenuItem value="2">2등</MenuItem>
          <MenuItem value="3">3등</MenuItem>
        </Select>
      </Stack>
      <Tooltip title="프로필 제외">
        <span>
          <IconButton
            size="small"
            color="error"
            disabled={isSaving}
            onClick={onRemove}
            aria-label={`${profile.name} 프로필 제외`}
            sx={{ml: 'auto'}}>
            <RemoveIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  )
}
