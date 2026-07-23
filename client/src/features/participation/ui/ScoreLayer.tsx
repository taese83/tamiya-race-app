import {useEffect, useMemo, useState} from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, TextField, Button, Stack, Divider, Chip, Collapse, CircularProgress, Alert,
  Tabs, Tab,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import {useScores, useSetManualScore} from '../model/useScores'
import type {ClassKey, ProfileScore} from '../model/useScores'
import {CLASS_LIST} from '../model/useScores'
import {useSession} from '@/features/auth'

interface ScoreLayerProps {
  open: boolean
  onClose: () => void
}

export const ScoreLayer = ({open, onClose}: ScoreLayerProps) => {
  const {user} = useSession()
  const {data, isLoading, error} = useScores(open && user != null)
  const [activeProfileId, setActiveProfileId] = useState<number | null>(null)

  // 첫 로드 시 default 프로필로 초기화
  useEffect(() => {
    if (!data || activeProfileId != null) return
    const def = data.profiles.find(p => p.is_default) ?? data.profiles[0]
    if (def) setActiveProfileId(def.profile_id)
  }, [data, activeProfileId])

  // 프로필 목록이 갱신되고 active가 사라지면 default로
  useEffect(() => {
    if (!data || activeProfileId == null) return
    const exists = data.profiles.some(p => p.profile_id === activeProfileId)
    if (!exists) {
      const def = data.profiles.find(p => p.is_default) ?? data.profiles[0]
      setActiveProfileId(def?.profile_id ?? null)
    }
  }, [data, activeProfileId])

  const activeProfile = data?.profiles.find(p => p.profile_id === activeProfileId) ?? null

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{fontSize: '1rem', fontWeight: 700, pb: 1}}>
          경기 기록
        </DialogTitle>
        <DialogContent>
          {isLoading && (
            <Stack alignItems="center" sx={{py: 3}}>
              <CircularProgress size={24} />
            </Stack>
          )}
          {error && <Alert severity="error" sx={{fontSize: '0.8rem'}}>{error.message}</Alert>}
          {data && data.profiles.length > 0 && activeProfile && (
            <Stack spacing={2}>
              {data.profiles.length > 1 && (
                <Tabs
                  value={activeProfileId ?? false}
                  onChange={(_, v) => setActiveProfileId(v as number)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{minHeight: 32, '& .MuiTab-root': {minHeight: 32, fontSize: '0.8rem'}}}>
                  {data.profiles.map(p => (
                    <Tab
                      key={p.profile_id}
                      value={p.profile_id}
                      label={p.name + (p.is_default ? ' ✦' : '')}
                    />
                  ))}
                </Tabs>
              )}
              <ProfilePanel profile={activeProfile} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>닫기</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

// ─── ProfilePanel ─────────────────────────────────────────────

const ProfilePanel = ({profile}: {profile: ProfileScore}) => {
  const setManual = useSetManualScore()
  const [manualOpen, setManualOpen] = useState(false)

  const classesWithData = useMemo(() => {
    return CLASS_LIST.filter(cls => {
      const s = profile.byClass[cls]
      return s.total > 0 || s.participate > 0
    })
  }, [profile])

  return (
    <Stack spacing={2}>
      {/* 프로필 총점 */}
      <Box sx={{textAlign: 'center', py: 1.5, bgcolor: 'action.hover', borderRadius: 2}}>
        <Typography variant="caption" color="text.secondary" sx={{fontSize: '0.72rem'}}>{profile.name} 총점</Typography>
        <Typography variant="h4" sx={{fontWeight: 700, color: 'primary.main', lineHeight: 1.2}}>
          {profile.profileTotal}
          <Typography component="span" variant="body2" color="text.secondary" sx={{ml: 0.5}}>점</Typography>
        </Typography>
      </Box>

      {/* 클래스별 breakdown */}
      <Box>
        <Typography variant="caption" sx={{fontWeight: 700, color: 'text.secondary', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block', mb: 0.75}}>
          클래스별 점수
        </Typography>
        {classesWithData.length === 0 ? (
          <Typography variant="caption" color="text.secondary" sx={{fontSize: '0.75rem'}}>
            아직 기록된 점수가 없습니다.
          </Typography>
        ) : (
          <Stack spacing={0.75}>
            {classesWithData.map(cls => {
              const s = profile.byClass[cls]
              return (
                <Box key={cls} sx={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr auto',
                  gap: 1.5,
                  alignItems: 'center',
                  px: 1, py: 0.75,
                  borderRadius: 1,
                  bgcolor: 'action.hover',
                }}>
                  <Typography variant="body2" sx={{fontWeight: 700, fontSize: '0.82rem'}}>{cls}</Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {s.participate > 0 && <Chip label={`참여 ${s.participate}`} size="small" sx={{height: 18, fontSize: '0.68rem'}} />}
                    {s.rank1 > 0 && <Chip label={`🥇${s.rank1}`} size="small" sx={{height: 18, fontSize: '0.68rem'}} />}
                    {s.rank2 > 0 && <Chip label={`🥈${s.rank2}`} size="small" sx={{height: 18, fontSize: '0.68rem'}} />}
                    {s.rank3 > 0 && <Chip label={`🥉${s.rank3}`} size="small" sx={{height: 18, fontSize: '0.68rem'}} />}
                  </Stack>
                  <Typography variant="body2" sx={{fontWeight: 700, color: 'primary.main', fontSize: '0.9rem'}}>
                    {s.total}점
                  </Typography>
                </Box>
              )
            })}
          </Stack>
        )}
        <Typography variant="caption" color="text.secondary" sx={{fontSize: '0.68rem', display: 'block', mt: 0.75}}>
          참여 1점 + 순위 보너스 (1등 5, 2등 3, 3등 1). 스테이션 경기의 M1/M2/M3만 총점에 누적됩니다.
        </Typography>
      </Box>

      {/* 월드/아시아 챌린지 — 점수 계산에는 안 들어가고 히스토리로만 표시 */}
      {(profile.challenges.world.participate > 0 || profile.challenges.asia.participate > 0) && (
        <Box>
          <Typography variant="caption" sx={{fontWeight: 700, color: 'text.secondary', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block', mb: 0.75}}>
            챌린지 참여
          </Typography>
          <Stack spacing={0.75}>
            {(['world', 'asia'] as const).map(type => {
              const s = profile.challenges[type]
              if (s.participate === 0) return null
              return (
                <Box key={type} sx={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr',
                  gap: 1.5,
                  alignItems: 'center',
                  px: 1, py: 0.75,
                  borderRadius: 1,
                  bgcolor: 'action.hover',
                }}>
                  <Typography variant="body2" sx={{fontWeight: 700, fontSize: '0.82rem'}}>
                    {type === 'world' ? 'TMWC' : 'TMAC'}
                  </Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    <Chip label={`참여 ${s.participate}`} size="small" sx={{height: 18, fontSize: '0.68rem'}} />
                    {s.rank1 > 0 && <Chip label={`🥇${s.rank1}`} size="small" sx={{height: 18, fontSize: '0.68rem'}} />}
                    {s.rank2 > 0 && <Chip label={`🥈${s.rank2}`} size="small" sx={{height: 18, fontSize: '0.68rem'}} />}
                    {s.rank3 > 0 && <Chip label={`🥉${s.rank3}`} size="small" sx={{height: 18, fontSize: '0.68rem'}} />}
                  </Stack>
                </Box>
              )
            })}
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{fontSize: '0.68rem', display: 'block', mt: 0.75}}>
            챌린지 경기는 스테이션 점수에 합산되지 않고 별도로 기록됩니다.
          </Typography>
        </Box>
      )}

      <Divider />

      {/* 수동 점수 등록 (클래스별) */}
      <Box>
        <Button
          size="small"
          variant="text"
          onClick={() => setManualOpen(v => !v)}
          endIcon={manualOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          sx={{
            fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
            color: 'text.secondary', letterSpacing: 0.5, py: 0, minWidth: 0,
          }}>
          수동 점수 등록 (클래스별)
        </Button>
        <Collapse in={manualOpen}>
          <Box sx={{mt: 1}}>
            <Typography variant="caption" color="text.secondary" sx={{fontSize: '0.7rem', display: 'block', mb: 1}}>
              이전 경기 참여·순위 횟수를 입력하면 참여 1점 + 1등 5점 + 2등 3점 + 3등 1점 규칙으로 자동 계산해 클래스 총점과 카드 카운트에 합산됩니다.
            </Typography>
            <Stack spacing={1.25}>
              {CLASS_LIST.map(cls => {
                const s = profile.byClass[cls]
                return (
                  <ManualCountRow
                    key={cls}
                    cls={cls}
                    initial={{
                      participate: s.manualParticipate,
                      rank1: s.manualRank1,
                      rank2: s.manualRank2,
                      rank3: s.manualRank3,
                    }}
                    onApply={(counts) => setManual.mutate({profileId: profile.profile_id, class: cls, ...counts})}
                    disabled={setManual.isPending}
                  />
                )
              })}
            </Stack>
            {setManual.error && (
              <Typography variant="caption" color="error" sx={{fontSize: '0.7rem', mt: 0.5, display: 'block'}}>
                {setManual.error.message}
              </Typography>
            )}
          </Box>
        </Collapse>
      </Box>
    </Stack>
  )
}

// ─── ManualCountRow ───────────────────────────────────────────

interface ManualCountRowProps {
  cls: ClassKey
  initial: {participate: number; rank1: number; rank2: number; rank3: number}
  onApply: (counts: {participate: number; rank1: number; rank2: number; rank3: number}) => void
  disabled: boolean
}

const ManualCountRow = ({cls, initial, onApply, disabled}: ManualCountRowProps) => {
  const [participate, setParticipate] = useState<string>(String(initial.participate))
  const [rank1, setRank1] = useState<string>(String(initial.rank1))
  const [rank2, setRank2] = useState<string>(String(initial.rank2))
  const [rank3, setRank3] = useState<string>(String(initial.rank3))

  // 외부 initial이 갱신되면 인풋도 갱신 (다른 세션 저장 반영)
  useEffect(() => { setParticipate(String(initial.participate)) }, [initial.participate])
  useEffect(() => { setRank1(String(initial.rank1)) }, [initial.rank1])
  useEffect(() => { setRank2(String(initial.rank2)) }, [initial.rank2])
  useEffect(() => { setRank3(String(initial.rank3)) }, [initial.rank3])

  const parseCount = (s: string): number | null => {
    if (s === '') return 0
    const n = Number(s)
    if (!Number.isFinite(n) || n < 0 || n > 10000) return null
    return Math.floor(n)
  }
  const p = parseCount(participate)
  const r1 = parseCount(rank1)
  const r2 = parseCount(rank2)
  const r3 = parseCount(rank3)
  const allValid = p != null && r1 != null && r2 != null && r3 != null
  const changed = allValid && (
    p !== initial.participate || r1 !== initial.rank1 ||
    r2 !== initial.rank2 || r3 !== initial.rank3
  )
  const computedPoints = allValid ? p * 1 + r1 * 5 + r2 * 3 + r3 * 1 : 0

  return (
    <Box sx={{px: 1, py: 0.75, borderRadius: 1, bgcolor: 'action.hover'}}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{mb: 0.5}}>
        <Typography variant="body2" sx={{fontSize: '0.82rem', fontWeight: 700, minWidth: 70}}>{cls}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{fontSize: '0.7rem'}}>
          {allValid ? `계산: ${computedPoints}점` : '숫자를 확인하세요'}
        </Typography>
      </Stack>
      <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
        <CountField label="참여" value={participate} onChange={setParticipate} disabled={disabled} />
        <CountField label="1등" value={rank1} onChange={setRank1} disabled={disabled} />
        <CountField label="2등" value={rank2} onChange={setRank2} disabled={disabled} />
        <CountField label="3등" value={rank3} onChange={setRank3} disabled={disabled} />
        <Button
          variant="contained"
          size="small"
          disabled={!allValid || !changed || disabled}
          onClick={() => onApply({participate: p!, rank1: r1!, rank2: r2!, rank3: r3!})}
          sx={{ml: 'auto', minWidth: 56, height: 32}}>
          적용
        </Button>
      </Stack>
    </Box>
  )
}

interface CountFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  disabled: boolean
}

const CountField = ({label, value, onChange, disabled}: CountFieldProps) => (
  <Stack direction="row" alignItems="center" spacing={0.5}>
    <Typography variant="caption" sx={{fontSize: '0.7rem', color: 'text.secondary', minWidth: 24}}>{label}</Typography>
    <TextField
      size="small"
      type="number"
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      inputProps={{min: 0, max: 10000, step: 1, style: {padding: '4px 6px', width: 48, textAlign: 'center'}}}
      sx={{'& .MuiOutlinedInput-root': {height: 32}}}
    />
  </Stack>
)
