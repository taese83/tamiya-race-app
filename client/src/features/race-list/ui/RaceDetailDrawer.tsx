import {useQuery} from '@tanstack/react-query'
import {
  Drawer, Box, Typography, IconButton, Divider,
  Stack, Chip, Button, CircularProgress, Alert,
  List, ListItem, ListItemText,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PaidIcon from '@mui/icons-material/Paid'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import HowToRegIcon from '@mui/icons-material/HowToReg'
import PhoneIcon from '@mui/icons-material/Phone'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import {format, isPast, parseISO} from 'date-fns'
import {ko} from 'date-fns/locale'
import {fetchRaceDetail, raceDetailQueryKey} from '@/entities/race'
import type {RaceEntry} from '@/entities/race'
import {CategoryChip} from './CategoryChip'

interface RaceDetailDrawerProps {
  race: RaceEntry | null
  onClose: () => void
}

function parseTamiyaDate(dateStr: string): Date {
  return parseISO(dateStr.replace(/\./g, '-'))
}

export const RaceDetailDrawer = ({race, onClose}: RaceDetailDrawerProps) => {
  // wr_id 추출: id="723-0" → "723"
  const wrId = race?.id.split('-')[0] ?? ''

  const {data, isLoading, isError} = useQuery({
    queryKey: raceDetailQueryKey(wrId),
    queryFn: ({signal}) => fetchRaceDetail(wrId, signal),
    enabled: Boolean(wrId) && Boolean(race),
    staleTime: 30 * 60 * 1000,
    retry: 1,
  })

  const detail = data?.data
  const isOnlineApply = Boolean(detail?.applyUrl) || (
    detail?.registrationMethod?.includes('접수하기') ||
    detail?.registrationMethod?.includes('온라인 접수') || false
  )
  const isPastRace = race ? isPast(parseTamiyaDate(race.date)) : false

  return (
    <Drawer
      anchor="right"
      open={Boolean(race)}
      onClose={onClose}
      slotProps={{paper: {sx: {width: {xs: '100vw', sm: 420}, overflowX: 'hidden'}}}}>
      <Box sx={{display: 'flex', flexDirection: 'column', height: '100%'}}>

        {/* 헤더 */}
        <Box sx={{px: 2.5, py: 2, display: 'flex', alignItems: 'flex-start', gap: 1, borderBottom: '1px solid', borderColor: 'divider'}}>
          <Box sx={{flex: 1}}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{mb: 0.5}}>
              {race && <CategoryChip category={race.category} />}
              {isPastRace && <Chip label="종료" size="small" sx={{height: 20, fontSize: '0.68rem'}} />}
            </Stack>
            <Typography variant="h6" sx={{fontWeight: 700, fontSize: '1rem', lineHeight: 1.4}}>
              {race?.title ?? ''}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} aria-label="닫기" sx={{mt: -0.5}}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* 기본 정보 */}
        {race && (
          <Box sx={{px: 2.5, py: 2, bgcolor: 'action.hover'}}>
            <List dense disablePadding>
              <ListItem disablePadding sx={{mb: 0.5}}>
                <ListItemText
                  primary="일시"
                  secondary={`${format(parseTamiyaDate(race.date), 'yyyy년 M월 d일 (EEE)', {locale: ko})}${race.time ? ` ${race.time}` : ''}`}
                  slotProps={{primary: {variant: 'caption', color: 'text.secondary', sx: {minWidth: 72, display: 'inline-block'}}, secondary: {variant: 'body2', sx: {fontWeight: 600, display: 'inline'}}}}
                  sx={{'& .MuiListItemText-primary': {mr: 1}}}
                />
              </ListItem>
              <ListItem disablePadding>
                <ListItemText
                  primary="장소"
                  secondary={race.venue}
                  slotProps={{primary: {variant: 'caption', color: 'text.secondary', sx: {minWidth: 72, display: 'inline-block'}}, secondary: {variant: 'body2', sx: {display: 'inline'}}}}
                />
              </ListItem>
            </List>
            {/* 선착순 / 매장 오픈 시간 등 부연설명 */}
            {race.note && (
              <Stack direction="row" spacing={0.75} alignItems="flex-start" sx={{mt: 1.5, px: 1.5, py: 1, bgcolor: 'warning.light', borderRadius: 1.5, opacity: 0.9}}>
                <InfoOutlinedIcon sx={{fontSize: 15, color: 'warning.dark', mt: 0.1, flexShrink: 0}} />
                <Typography variant="caption" sx={{fontSize: '0.78rem', color: 'warning.dark', fontWeight: 500, lineHeight: 1.5}}>
                  {race.note}
                </Typography>
              </Stack>
            )}
          </Box>
        )}

        <Divider />

        {/* 상세 정보 */}
        <Box sx={{flex: 1, overflowY: 'auto', px: 2.5, py: 2}}>
          {isLoading && (
            <Stack alignItems="center" spacing={1.5} sx={{py: 4}}>
              <CircularProgress size={28} />
              <Typography variant="caption" color="text.secondary">접수 정보를 불러오는 중...</Typography>
            </Stack>
          )}

          {isError && (
            <Alert severity="warning" sx={{my: 1}}>
              접수 정보를 불러오지 못했습니다.
            </Alert>
          )}

          {detail && (
            <Stack spacing={2.5}>
              {/* 참가비 */}
              {detail.entranceFee && (
                <Box>
                  <Stack direction="row" spacing={0.75} alignItems="center" sx={{mb: 0.75}}>
                    <PaidIcon sx={{fontSize: 16, color: 'primary.main'}} />
                    <Typography variant="caption" sx={{fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5}}>
                      참가비
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{pl: 3}}>
                    {detail.entranceFee}
                  </Typography>
                </Box>
              )}

              {/* 접수 기한 */}
              {detail.registrationDeadline && (
                <Box>
                  <Stack direction="row" spacing={0.75} alignItems="center" sx={{mb: 0.75}}>
                    <AccessTimeIcon sx={{fontSize: 16, color: 'primary.main'}} />
                    <Typography variant="caption" sx={{fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5}}>
                      접수 기한
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{pl: 3}}>
                    {detail.registrationDeadline}
                  </Typography>
                </Box>
              )}

              {/* 접수 방법 */}
              {detail.registrationMethod && (
                <Box>
                  <Stack direction="row" spacing={0.75} alignItems="center" sx={{mb: 0.75}}>
                    <HowToRegIcon sx={{fontSize: 16, color: 'primary.main'}} />
                    <Typography variant="caption" sx={{fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5}}>
                      접수 방법
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{pl: 3, whiteSpace: 'pre-line'}}>
                    {detail.registrationMethod}
                  </Typography>
                </Box>
              )}

              {/* 문의 */}
              {detail.inquiry && (
                <Box>
                  <Stack direction="row" spacing={0.75} alignItems="center" sx={{mb: 0.75}}>
                    <PhoneIcon sx={{fontSize: 16, color: 'primary.main'}} />
                    <Typography variant="caption" sx={{fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5}}>
                      문의
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{pl: 3, whiteSpace: 'pre-line'}}>
                    {detail.inquiry}
                  </Typography>
                </Box>
              )}

              {/* 온라인 접수 버튼 */}
              {isOnlineApply && (
                <Box sx={{pt: 1}}>
                  <Divider sx={{mb: 2}} />
                  {detail.applyUrl ? (
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      size="large"
                      startIcon={<HowToRegIcon />}
                      endIcon={<OpenInNewIcon fontSize="small" />}
                      href={detail.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      disabled={isPastRace}
                      sx={{fontWeight: 700, borderRadius: 2}}>
                      {detail.applyButtonText ?? '접수하기'}
                    </Button>
                  ) : (
                    // URL을 찾지 못했지만 온라인 접수가 있는 경우 → 원본 페이지 링크
                    <Button
                      variant="outlined"
                      color="primary"
                      fullWidth
                      size="large"
                      startIcon={<OpenInNewIcon />}
                      href={race?.detailUrl ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      disabled={isPastRace}
                      sx={{fontWeight: 700, borderRadius: 2}}>
                      타미야 사이트에서 접수하기
                    </Button>
                  )}
                  {isPastRace && (
                    <Typography variant="caption" color="text.secondary" sx={{display: 'block', textAlign: 'center', mt: 0.75}}>
                      접수 기간이 종료됐습니다
                    </Typography>
                  )}
                </Box>
              )}
            </Stack>
          )}
        </Box>

        {/* 푸터 — 원본 페이지 링크 */}
        <Box sx={{px: 2.5, py: 1.5, borderTop: '1px solid', borderColor: 'divider'}}>
          <Button
            variant="text"
            size="small"
            endIcon={<OpenInNewIcon sx={{fontSize: 14}} />}
            href={race?.detailUrl ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            sx={{color: 'text.secondary', fontSize: '0.75rem'}}>
            타미야 원본 페이지 보기
          </Button>
        </Box>
      </Box>
    </Drawer>
  )
}
