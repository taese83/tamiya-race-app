import {useEffect, useState} from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, TextField, Button, Stack, Divider, Chip, Collapse, CircularProgress, Alert,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import {useScores, useSetManualScore} from '../model/useScores'
import {useSession} from '@/features/auth'

interface ScoreLayerProps {
  open: boolean
  onClose: () => void
}

export const ScoreLayer = ({open, onClose}: ScoreLayerProps) => {
  const {user} = useSession()
  const {data, isLoading, error} = useScores(open && user != null)
  const setManual = useSetManualScore()
  const [manualInput, setManualInput] = useState('')
  const [manualOpen, setManualOpen] = useState(false)

  // 데이터 로드 후 인풋 초기화
  useEffect(() => {
    if (data) setManualInput(String(data.manual))
  }, [data])

  // Dialog 닫히면 접힘 상태 리셋 (다음 오픈 시 기본 닫힘)
  useEffect(() => {
    if (!open) setManualOpen(false)
  }, [open])

  const inputNum = Number(manualInput)
  const canApply =
    manualInput !== '' &&
    Number.isFinite(inputNum) &&
    inputNum >= 0 &&
    inputNum <= 100000 &&
    data != null &&
    Math.floor(inputNum) !== data.manual

  const stationCount = data?.entries.filter(e => e.is_station).length ?? 0
  const rankCounts = {
    1: data?.entries.filter(e => e.is_station && e.rank === 1).length ?? 0,
    2: data?.entries.filter(e => e.is_station && e.rank === 2).length ?? 0,
    3: data?.entries.filter(e => e.is_station && e.rank === 3).length ?? 0,
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{fontSize: '1rem', fontWeight: 700, pb: 1}}>스테이션 점수</DialogTitle>
      <DialogContent>
        {isLoading && (
          <Stack alignItems="center" sx={{py: 3}}>
            <CircularProgress size={24} />
          </Stack>
        )}
        {error && <Alert severity="error" sx={{fontSize: '0.8rem'}}>{error.message}</Alert>}
        {data && (
          <Stack spacing={2}>
            {/* 총점 */}
            <Box sx={{textAlign: 'center', py: 1.5, bgcolor: 'action.hover', borderRadius: 2}}>
              <Typography variant="caption" color="text.secondary" sx={{fontSize: '0.72rem'}}>총점</Typography>
              <Typography variant="h4" sx={{fontWeight: 700, color: 'primary.main', lineHeight: 1.2}}>
                {data.total}
                <Typography component="span" variant="body2" color="text.secondary" sx={{ml: 0.5}}>점</Typography>
              </Typography>
            </Box>

            {/* 브레이크다운 */}
            <Stack direction="row" spacing={1} justifyContent="center">
              <Chip
                label={`스테이션 ${data.stationTotal}점`}
                size="small"
                color="primary"
                variant="outlined"
              />
              <Chip
                label={`수동 ${data.manual}점`}
                size="small"
                variant="outlined"
              />
            </Stack>

            <Divider />

            {/* 참여 통계 */}
            <Box>
              <Typography variant="caption" sx={{fontWeight: 700, color: 'text.secondary', fontSize: '0.72rem', textTransform: 'uppercase'}}>
                스테이션 참여
              </Typography>
              <Stack direction="row" spacing={1} sx={{mt: 0.5}} flexWrap="wrap" useFlexGap>
                <Chip label={`참여 ${stationCount}회`} size="small" sx={{fontSize: '0.72rem'}} />
                {rankCounts[1] > 0 && <Chip label={`🥇 1등 ${rankCounts[1]}회`} size="small" sx={{fontSize: '0.72rem'}} />}
                {rankCounts[2] > 0 && <Chip label={`🥈 2등 ${rankCounts[2]}회`} size="small" sx={{fontSize: '0.72rem'}} />}
                {rankCounts[3] > 0 && <Chip label={`🥉 3등 ${rankCounts[3]}회`} size="small" sx={{fontSize: '0.72rem'}} />}
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{fontSize: '0.68rem', display: 'block', mt: 0.75}}>
                참여 1점 + 순위 보너스 (1등 5, 2등 3, 3등 1)
              </Typography>
            </Box>

            <Divider />

            {/* 수동 점수 (이전 경기 소급 적용용) — 기본 접힘, 필요 시 펼쳐서 사용 */}
            <Box>
              <Button
                size="small"
                variant="text"
                onClick={() => setManualOpen(v => !v)}
                endIcon={manualOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                sx={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'text.secondary',
                  letterSpacing: 0.5,
                  py: 0,
                  minWidth: 0,
                }}>
                수동 누적 점수 {data.manual > 0 && `(${data.manual})`}
              </Button>
              <Collapse in={manualOpen}>
                <Box sx={{mt: 1}}>
                  <Typography variant="caption" color="text.secondary" sx={{fontSize: '0.7rem', display: 'block', mb: 0.75}}>
                    이전 경기 점수를 소급 적용할 때 사용합니다. 참여 기록 이전에 쌓인 점수를 입력하면 총점에 합산됩니다.
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      size="small"
                      type="number"
                      value={manualInput}
                      onChange={e => setManualInput(e.target.value)}
                      inputProps={{min: 0, max: 100000, step: 1}}
                      sx={{flex: 1}}
                    />
                    <Button
                      variant="contained"
                      size="small"
                      disabled={!canApply || setManual.isPending}
                      onClick={() => setManual.mutate(Math.floor(inputNum))}>
                      적용
                    </Button>
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
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>
    </Dialog>
  )
}
