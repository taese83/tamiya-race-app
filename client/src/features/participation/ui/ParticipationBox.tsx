import {Box, Checkbox, FormControlLabel, MenuItem, Select, Stack, Tooltip, Typography} from '@mui/material'
import type {SelectChangeEvent} from '@mui/material'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import {useSession, loginWithGoogle} from '@/features/auth'
import {
  useParticipations,
  useUpsertParticipation,
  useDeleteParticipation,
  makeParticipationMap,
} from '../model/useParticipations'

interface ParticipationBoxProps {
  raceId: string
  wrId: string
  /** 경기 날짜 (YYYY.MM.DD). 오늘 미만이면 참여 체크 disable */
  raceDate: string
}

/** race.date (YYYY.MM.DD)가 오늘 이후인지 (오늘 포함). true면 아직 시작 안 함. */
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
  const {data: list} = useParticipations(user != null)
  const upsert = useUpsertParticipation()
  const remove = useDeleteParticipation()

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

  const map = makeParticipationMap(list)
  const current = map.get(raceId)
  const isParticipating = current != null
  const rank = current?.rank ?? null

  const handleCheck = (checked: boolean) => {
    if (checked) {
      // 이미 참여 안 된 상태에서 체크 → rank null로 upsert
      upsert.mutate({raceId, wrId, rank: null})
    } else {
      remove.mutate(raceId)
    }
  }

  const handleRankChange = (e: SelectChangeEvent) => {
    const v = e.target.value
    const nextRank = v === '' ? null : Number(v) as 1 | 2 | 3
    upsert.mutate({raceId, wrId, rank: nextRank})
  }

  const isSaving = upsert.isPending || remove.isPending
  const beforeRace = isBeforeRaceDay(raceDate)
  const checkDisabled = isSaving || beforeRace
  const rankDisabled = isSaving || !isParticipating

  const participateControl = (
    <FormControlLabel
      control={
        <Checkbox
          size="small"
          checked={isParticipating}
          disabled={checkDisabled}
          onChange={(_, checked) => handleCheck(checked)}
        />
      }
      label={
        <Typography variant="body2" sx={{fontSize: '0.85rem', color: beforeRace ? 'text.disabled' : undefined}}>
          참여
        </Typography>
      }
    />
  )

  return (
    <Box>
      {SectionHeader}
      <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" useFlexGap sx={{pl: 3}}>
        {beforeRace ? (
          <Tooltip title="경기 당일부터 참여 체크가 가능합니다">
            <span>{participateControl}</span>
          </Tooltip>
        ) : (
          participateControl
        )}

        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography
            variant="body2"
            sx={{fontSize: '0.85rem', color: rankDisabled ? 'text.disabled' : undefined}}>
            결과
          </Typography>
          <Select
            size="small"
            value={rank == null ? '' : String(rank)}
            onChange={handleRankChange}
            disabled={rankDisabled}
            sx={{minWidth: 100, height: 30, fontSize: '0.8rem'}}
            displayEmpty>
            <MenuItem value=""><em>선택 안 함</em></MenuItem>
            <MenuItem value="1">1등</MenuItem>
            <MenuItem value="2">2등</MenuItem>
            <MenuItem value="3">3등</MenuItem>
          </Select>
        </Stack>

        {upsert.error && (
          <Typography variant="caption" color="error" sx={{fontSize: '0.7rem'}}>
            저장 실패
          </Typography>
        )}
      </Stack>
    </Box>
  )
}
