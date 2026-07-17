/**
 * 접수 상세 드로어
 * 같은 장소에서 여러 클래스가 접수 시작할 때, wrId별로 그룹핑해
 * 각 그룹의 클래스 목록과 접수 정보(기한·방법·URL)를 표시한다.
 */
import type {ReactNode} from 'react'
import {useQueries} from '@tanstack/react-query'
import {
  Drawer, Box, Typography, IconButton, Divider,
  Stack, Button, CircularProgress, Alert, Chip,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import HowToRegIcon from '@mui/icons-material/HowToReg'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import MapIcon from '@mui/icons-material/Map'
import {format, parseISO} from 'date-fns'
import {ko} from 'date-fns/locale'
import {fetchRaceDetail, raceDetailQueryKey} from '@/entities/race'
import type {RaceEntry, RaceDetail} from '@/entities/race'
import {CategoryChip} from '@/entities/race'
import {getRegistrationStatus, REGISTRATION_STATUS_LABEL, REGISTRATION_STATUS_COLOR} from '@/shared/lib/raceMeta'

interface RegistrationDrawerProps {
  races: RaceEntry[]
  onClose: () => void
}

function parseTamiyaDate(dateStr: string): Date {
  return parseISO(dateStr.replace(/\./g, '-'))
}

function safeUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? url : undefined
  } catch {
    return undefined
  }
}

function googleMapsUrl(venue: string): string {
  const query = venue.includes('타미야') ? venue : `타미야 ${venue}`
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}`
}

interface InfoRowProps {
  label: string
  children: ReactNode
}

const InfoRow = ({label, children}: InfoRowProps) => (
  <Box sx={{display: 'grid', gridTemplateColumns: '64px 1fr', gap: 1, alignItems: 'flex-start', mb: 0.75}}>
    <Typography variant="caption" color="text.secondary" sx={{pt: '2px', fontWeight: 500}}>
      {label}
    </Typography>
    <Box>{children}</Box>
  </Box>
)

// ─── wrId별 접수 그룹 섹션 ───────────────────────────────────────────────────

interface RegistrationGroupSectionProps {
  races: RaceEntry[]
  detail: RaceDetail | undefined
  isLoading: boolean
  isError: boolean
  showDivider: boolean
}

const RegistrationGroupSection = ({races, detail, isLoading, isError, showDivider}: RegistrationGroupSectionProps) => {
  const raceYear = races[0] ? parseInt(races[0].date.split('.')[0] ?? '', 10) || undefined : undefined
  const isOnlineApply = Boolean(detail?.applyUrl) || (
    detail?.registrationMethod?.includes('접수하기') ||
    detail?.registrationMethod?.includes('온라인 접수') || false
  )
  const status = detail?.registrationDeadline
    ? getRegistrationStatus(detail.registrationDeadline, raceYear)
    : null
  const statusColor = status ? REGISTRATION_STATUS_COLOR[status] : '#546e7a'
  const statusLabel = status ? REGISTRATION_STATUS_LABEL[status] : null

  return (
    <>
      {showDivider && <Divider sx={{my: 1.5}} />}

      {/* 클래스 목록 */}
      <Box sx={{mb: 1.5}}>
        {statusLabel && (
          <Chip
            label={statusLabel}
            size="small"
            sx={{height: 18, fontSize: '0.65rem', bgcolor: statusColor, color: '#fff', fontWeight: 700, mb: 1}}
          />
        )}
        <Stack spacing={0.75}>
          {races.map(race => (
            <Stack key={race.id} direction="row" alignItems="center" spacing={1}>
              <CategoryChip category={race.category} />
              <Typography variant="caption" color="text.secondary" sx={{fontSize: '0.72rem'}}>
                경기일 {format(parseTamiyaDate(race.date), 'M월 d일 (EEE)', {locale: ko})}
                {race.time ? ` ${race.time}` : ''}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      {/* 접수 정보 */}
      {isLoading && (
        <Stack alignItems="center" spacing={1} sx={{py: 2}}>
          <CircularProgress size={22} />
          <Typography variant="caption" color="text.secondary">접수 정보 불러오는 중...</Typography>
        </Stack>
      )}

      {isError && (
        <Alert severity="warning" sx={{my: 0.5, py: 0.5}}>접수 정보를 불러오지 못했습니다.</Alert>
      )}

      {detail && (
        <Stack spacing={1.5}>
          {detail.registrationDeadline && (
            <Box>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{mb: 0.5}}>
                <AccessTimeIcon sx={{fontSize: 14, color: 'primary.main'}} />
                <Typography variant="caption" sx={{fontWeight: 700, color: 'text.secondary', fontSize: '0.70rem', letterSpacing: 0.5}}>
                  접수 기한
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{pl: 2.5}}>{detail.registrationDeadline}</Typography>
            </Box>
          )}

          {detail.registrationMethod && (
            <Box>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{mb: 0.5}}>
                <HowToRegIcon sx={{fontSize: 14, color: 'primary.main'}} />
                <Typography variant="caption" sx={{fontWeight: 700, color: 'text.secondary', fontSize: '0.70rem', letterSpacing: 0.5}}>
                  접수 방법
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{pl: 2.5, whiteSpace: 'pre-line'}}>{detail.registrationMethod}</Typography>
            </Box>
          )}

          {detail.entranceFee && (
            <Box>
              <Typography variant="caption" sx={{fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5, fontSize: '0.70rem', letterSpacing: 0.5}}>
                참가비
              </Typography>
              <Typography variant="body2" sx={{pl: 0.5}}>{detail.entranceFee}</Typography>
            </Box>
          )}

          {isOnlineApply && (
            <Box sx={{pt: 0.5}}>
              {detail.applyUrl ? (
                <Button
                  component="a"
                  variant="contained"
                  color="warning"
                  fullWidth
                  size="medium"
                  startIcon={<HowToRegIcon />}
                  endIcon={<OpenInNewIcon fontSize="small" />}
                  href={safeUrl(detail.applyUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{fontWeight: 700, borderRadius: 2}}>
                  {detail.applyButtonText ?? '접수하기'}
                </Button>
              ) : (
                safeUrl(races[0]?.detailUrl) && (
                  <Button
                    component="a"
                    variant="outlined"
                    color="warning"
                    fullWidth
                    size="medium"
                    startIcon={<OpenInNewIcon />}
                    href={safeUrl(races[0]?.detailUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{fontWeight: 700, borderRadius: 2}}>
                    타미야 사이트에서 접수하기
                  </Button>
                )
              )}
            </Box>
          )}
        </Stack>
      )}
    </>
  )
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export const RegistrationDrawer = ({races, onClose}: RegistrationDrawerProps) => {
  const venue = races[0]?.venue ?? ''

  // wrId별로 그룹핑 — 같은 공지(wrId)에 여러 클래스가 있을 수 있음
  const wrIdGroupMap = new Map<string, RaceEntry[]>()
  races.forEach(r => {
    const wrId = r.id.split('-').find(p => p.length > 0) ?? ''
    if (!wrId) return
    const arr = wrIdGroupMap.get(wrId) ?? []
    arr.push(r)
    wrIdGroupMap.set(wrId, arr)
  })
  const wrIdGroups = Array.from(wrIdGroupMap.entries())

  // 고유 wrId마다 상세 조회
  const detailQueries = useQueries({
    queries: wrIdGroups.map(([wrId]) => ({
      queryKey: raceDetailQueryKey(wrId),
      queryFn: ({signal}: {signal?: AbortSignal}) => fetchRaceDetail(wrId, signal),
      enabled: Boolean(wrId),
      staleTime: 30 * 60 * 1000,
      retry: 1 as const,
    })),
  })

  return (
    <Drawer
      anchor="right"
      open={races.length > 0}
      onClose={onClose}
      slotProps={{paper: {sx: {width: {xs: '100vw', sm: 440}, overflowX: 'hidden'}}}}>
      <Box sx={{display: 'flex', flexDirection: 'column', height: '100%'}}>

        {/* 헤더 */}
        <Box sx={{px: 2.5, py: 2, display: 'flex', alignItems: 'flex-start', gap: 1, borderBottom: '1px solid', borderColor: 'divider'}}>
          <Box sx={{flex: 1}}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{mb: 0.5}}>
              <HowToRegIcon sx={{fontSize: 16, color: 'warning.main'}} />
              <Typography variant="caption" sx={{fontWeight: 700, color: 'warning.dark', fontSize: '0.75rem'}}>
                접수 시작 · {races.length}개 클래스
              </Typography>
            </Stack>
            <Typography variant="h6" sx={{fontWeight: 700, fontSize: '1rem', lineHeight: 1.4}}>
              {venue}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} aria-label="닫기" sx={{mt: -0.5}}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* 장소 정보 */}
        <Box sx={{px: 2.5, py: 1.5, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider'}}>
          <InfoRow label="장소">
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <LocationOnIcon sx={{fontSize: 14, color: 'text.disabled', flexShrink: 0}} />
              <Typography variant="body2" sx={{flex: 1}}>{venue}</Typography>
              <IconButton
                size="small"
                component="a"
                href={googleMapsUrl(venue)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="구글 맵으로 보기"
                sx={{flexShrink: 0, color: 'primary.main', p: 0.25}}>
                <MapIcon sx={{fontSize: 18}} />
              </IconButton>
            </Stack>
          </InfoRow>
        </Box>

        {/* wrId별 접수 그룹 */}
        <Box sx={{flex: 1, overflowY: 'auto', px: 2.5, py: 2}}>
          {wrIdGroups.map(([_wrId, groupRaces], idx) => (
            <RegistrationGroupSection
              key={_wrId}
              races={groupRaces}
              detail={detailQueries[idx]?.data?.data}
              isLoading={detailQueries[idx]?.isLoading ?? false}
              isError={detailQueries[idx]?.isError ?? false}
              showDivider={idx > 0}
            />
          ))}
        </Box>
      </Box>
    </Drawer>
  )
}
