import {useState} from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, FormControl, InputLabel, Select, MenuItem,
  Typography, Stack, Chip, Box, Divider,
} from '@mui/material'
import AltRouteIcon from '@mui/icons-material/AltRoute'
import type {SelectChangeEvent} from '@mui/material'
import {CLASS_LIST} from '@/entities/race'
import type {RaceEntry} from '@/entities/race'
import type {ItineraryOptions} from './_types'

interface ItinerarySetupDialogProps {
  open: boolean
  races: RaceEntry[]
  onClose: () => void
  onConfirm: (options: ItineraryOptions) => void
}

export const ItinerarySetupDialog = ({
  open, races, onClose, onConfirm,
}: ItinerarySetupDialogProps) => {
  const [startVenue, setStartVenue] = useState<string>('')
  const [selectedClasses, setSelectedClasses] = useState<string[]>([])

  // 이 날짜에 실제로 있는 경기장 목록
  const venues = Array.from(new Set(races.map(r => r.venue)))

  const handleVenueChange = (e: SelectChangeEvent) => {
    setStartVenue(e.target.value)
  }

  const toggleClass = (key: string) => {
    setSelectedClasses(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const handleConfirm = () => {
    onConfirm({
      startVenue: startVenue || null,
      allowedCategories: selectedClasses,
    })
    // 다음 열기 시 초기값으로 복원
    setStartVenue('')
    setSelectedClasses([])
    onClose()
  }

  const handleClose = () => {
    // 다이얼로그 닫을 때 상태 초기화
    setStartVenue('')
    setSelectedClasses([])
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      slotProps={{paper: {sx: {borderRadius: 3}}}}>
      <DialogTitle sx={{pb: 1}}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <AltRouteIcon color="primary" />
          <Typography variant="h6" sx={{fontWeight: 700}}>동선 설정</Typography>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{pt: 1}}>
        <Stack spacing={2.5}>
          {/* 시작 장소 */}
          <FormControl size="small" fullWidth>
            <InputLabel id="start-venue-label">시작 장소</InputLabel>
            <Select
              labelId="start-venue-label"
              value={startVenue}
              label="시작 장소"
              onChange={handleVenueChange}>
              <MenuItem value="">
                <Typography color="text.secondary" variant="body2">자동 선택 (가장 많은 경기 장소)</Typography>
              </MenuItem>
              {venues.map(venue => (
                <MenuItem key={venue} value={venue}>{venue}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider />

          {/* 클래스 필터 */}
          <Box>
            <Typography variant="body2" sx={{fontWeight: 600, mb: 1}}>
              참여할 클래스
              <Typography component="span" variant="caption" color="text.secondary" sx={{ml: 0.75}}>
                (선택 안 하면 전체)
              </Typography>
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.75}>
              {CLASS_LIST.map(cls => {
                const selected = selectedClasses.includes(cls.key)
                return (
                  <Chip
                    key={cls.key}
                    label={cls.key}
                    size="small"
                    onClick={() => toggleClass(cls.key)}
                    sx={{
                      bgcolor: selected ? cls.color : 'transparent',
                      color: selected ? '#fff' : 'text.primary',
                      border: '1.5px solid',
                      borderColor: selected ? cls.color : 'divider',
                      fontWeight: selected ? 700 : 400,
                      cursor: 'pointer',
                      '&:hover': {opacity: 0.85},
                      transition: 'all 0.1s',
                    }}
                  />
                )
              })}
            </Stack>
            {selectedClasses.length === 0 && (
              <Typography variant="caption" color="text.secondary" sx={{mt: 0.5, display: 'block'}}>
                모든 클래스 대상
              </Typography>
            )}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{px: 3, pb: 2.5, gap: 1}}>
        <Button onClick={handleClose} color="inherit" size="small">취소</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          size="small"
          startIcon={<AltRouteIcon />}>
          동선 계산
        </Button>
      </DialogActions>
    </Dialog>
  )
}
