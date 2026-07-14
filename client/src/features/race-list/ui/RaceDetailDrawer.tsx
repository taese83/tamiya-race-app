import type {ReactNode} from 'react'
import {useQuery} from '@tanstack/react-query'
import {
  Drawer, Box, Typography, IconButton, Divider,
  Stack, Chip, Button, CircularProgress, Alert,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PaidIcon from '@mui/icons-material/Paid'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import HowToRegIcon from '@mui/icons-material/HowToReg'
import PhoneIcon from '@mui/icons-material/Phone'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import MapIcon from '@mui/icons-material/Map'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import {format, isPast, parseISO} from 'date-fns'
import {ko} from 'date-fns/locale'
import {fetchRaceDetail, raceDetailQueryKey} from '@/entities/race'
import type {RaceEntry} from '@/entities/race'
import {CategoryChip} from '@/entities/race'

interface RaceDetailDrawerProps {
  race: RaceEntry | null
  onClose: () => void
}

function parseTamiyaDate(dateStr: string): Date {
  return parseISO(dateStr.replace(/\./g, '-'))
}

// 한국 전화번호 추출: 지역번호(02~0xx) + 휴대폰(010~019)
// source만 보관하고 exec 시 매번 새 regex 생성 → global flag lastIndex 상태 오염 방지
const PHONE_RE_SOURCE = /(\d{2,4}[-\s]?\d{3,4}[-\s]?\d{4})/

interface PhoneSegment {
  type: 'text' | 'phone'
  value: string
}

function parseInquirySegments(text: string): PhoneSegment[] {
  const segments: PhoneSegment[] = []
  let last = 0
  // matchAll: 매 호출마다 독립 이터레이터, lastIndex 부작용 없음
  for (const match of text.matchAll(new RegExp(PHONE_RE_SOURCE.source, 'g'))) {
    if (match.index > last) {
      segments.push({type: 'text', value: text.slice(last, match.index)})
    }
    segments.push({type: 'phone', value: match[0]})
    last = match.index + match[0].length
  }
  if (last < text.length) {
    segments.push({type: 'text', value: text.slice(last)})
  }
  return segments.length > 0 ? segments : [{type: 'text', value: text}]
}

function googleMapsUrl(venue: string): string {
  // 장소명에 '타미야'가 없으면 앞에 붙여 검색 정확도를 높인다
  const query = venue.includes('타미야') ? venue : `타미야 ${venue}`
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}`
}

// ─── 기본 정보 행 (레이블 고정 너비 + 값 정렬) ───────────────────────────────

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

// ─── 문의 텍스트 — 전화번호 tel: 링크로 변환 ─────────────────────────────────

const InquiryText = ({text}: {text: string}) => {
  const segments = parseInquirySegments(text)
  return (
    <Typography variant="body2" sx={{whiteSpace: 'pre-line', lineHeight: 1.7}}>
      {segments.map((seg, i) =>
        seg.type === 'phone' ? (
          <Box
            key={i}
            component="a"
            href={`tel:${seg.value.replace(/[-\s]/g, '')}`}
            sx={{
              color: 'primary.main', fontWeight: 600, textDecoration: 'none',
              verticalAlign: 'baseline',
              '&:hover': {textDecoration: 'underline'},
            }}>
            {seg.value}
          </Box>
        ) : (
          <span key={i}>{seg.value}</span>
        )
      )}
    </Typography>
  )
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export const RaceDetailDrawer = ({race, onClose}: RaceDetailDrawerProps) => {
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

        {/* 기본 정보 — grid 2열 정렬 */}
        {race && (
          <Box sx={{px: 2.5, py: 2, bgcolor: 'action.hover'}}>
            <InfoRow label="일시">
              <Typography variant="body2" sx={{fontWeight: 600}}>
                {format(parseTamiyaDate(race.date), 'yyyy년 M월 d일 (EEE)', {locale: ko})}
              </Typography>
              {race.time && (
                <Stack direction="row" alignItems="center" spacing={0.4} sx={{mt: 0.25}}>
                  <AccessTimeIcon sx={{fontSize: 13, color: 'text.disabled'}} />
                  <Typography variant="body2" color="text.secondary">{race.time}</Typography>
                </Stack>
              )}
            </InfoRow>

            <InfoRow label="장소">
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <LocationOnIcon sx={{fontSize: 14, color: 'text.disabled', flexShrink: 0}} />
                <Typography variant="body2" sx={{flex: 1}}>{race.venue}</Typography>
                <IconButton
                  size="small"
                  component="a"
                  href={googleMapsUrl(race.venue)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="구글 맵으로 보기"
                  sx={{flexShrink: 0, color: 'primary.main', p: 0.25}}>
                  <MapIcon sx={{fontSize: 18}} />
                </IconButton>
              </Stack>
            </InfoRow>

            {/* 선착순 / 매장 오픈 시간 등 부연설명 */}
            {race.note && (
              <Stack direction="row" spacing={0.75} alignItems="flex-start" sx={{mt: 1, px: 1.5, py: 1, bgcolor: 'warning.light', borderRadius: 1.5, opacity: 0.9}}>
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
                    <Typography variant="caption" sx={{fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5}}>참가비</Typography>
                  </Stack>
                  <Typography variant="body2" sx={{pl: 3}}>{detail.entranceFee}</Typography>
                </Box>
              )}

              {/* 접수 기한 */}
              {detail.registrationDeadline && (
                <Box>
                  <Stack direction="row" spacing={0.75} alignItems="center" sx={{mb: 0.75}}>
                    <AccessTimeIcon sx={{fontSize: 16, color: 'primary.main'}} />
                    <Typography variant="caption" sx={{fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5}}>접수 기한</Typography>
                  </Stack>
                  <Typography variant="body2" sx={{pl: 3}}>{detail.registrationDeadline}</Typography>
                </Box>
              )}

              {/* 접수 방법 */}
              {detail.registrationMethod && (
                <Box>
                  <Stack direction="row" spacing={0.75} alignItems="center" sx={{mb: 0.75}}>
                    <HowToRegIcon sx={{fontSize: 16, color: 'primary.main'}} />
                    <Typography variant="caption" sx={{fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5}}>접수 방법</Typography>
                  </Stack>
                  <Typography variant="body2" sx={{pl: 3, whiteSpace: 'pre-line'}}>{detail.registrationMethod}</Typography>
                </Box>
              )}

              {/* 문의 — 전화번호 tel: 링크 */}
              {detail.inquiry && (
                <Box>
                  <Stack direction="row" spacing={0.75} alignItems="center" sx={{mb: 0.75}}>
                    <PhoneIcon sx={{fontSize: 16, color: 'primary.main'}} />
                    <Typography variant="caption" sx={{fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5}}>문의</Typography>
                  </Stack>
                  <Box sx={{pl: 3}}>
                    <InquiryText text={detail.inquiry} />
                  </Box>
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

        {/* 푸터 — 원본 페이지 링크 (detailUrl 없으면 숨김) */}
        {race?.detailUrl && (
          <Box sx={{px: 2.5, py: 1.5, borderTop: '1px solid', borderColor: 'divider'}}>
            <Button
              variant="text"
              size="small"
              endIcon={<OpenInNewIcon sx={{fontSize: 14}} />}
              href={race.detailUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{color: 'text.secondary', fontSize: '0.75rem'}}>
              타미야 원본 페이지 보기
            </Button>
          </Box>
        )}
      </Box>
    </Drawer>
  )
}
