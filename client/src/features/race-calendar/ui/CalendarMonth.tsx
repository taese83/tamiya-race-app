import {useState} from 'react'
import {
  Box, Typography, Paper, Stack, IconButton, Tooltip,
  useMediaQuery, Drawer, Divider,
} from '@mui/material'
import {useTheme} from '@mui/material/styles'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import HowToRegIcon from '@mui/icons-material/HowToReg'
import CloseIcon from '@mui/icons-material/Close'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, isPast, startOfDay,
} from 'date-fns'
import {ko} from 'date-fns/locale'
import type {RaceEntry} from '@/entities/race'
import {CLASS_LIST, getCategoryColor} from '@/entities/race'
import {CategoryChip} from '@/entities/race'
import {getRaceType, RACE_TYPE_LABEL, RACE_TYPE_COLOR, getRegistrationStatus, REGISTRATION_STATUS_LABEL, REGISTRATION_STATUS_COLOR} from '@/shared/lib/raceMeta'

/** 월드/아시아 챌린지는 검은색, 스테이션은 클래스 색상 */
function getRaceBoxColor(race: {title: string; category: string}): string {
  const type = getRaceType(race.title)
  return type === 'world' || type === 'asia' ? '#212121' : getCategoryColor(race.category)
}

interface CalendarMonthProps {
  races: RaceEntry[]
  onRaceClick: (race: RaceEntry) => void
}

const MAX_SHOW = 3
const DAY_HEADERS = ['일', '월', '화', '수', '목', '금', '토']

// ─── 시간순 정렬 ──────────────────────────────────────────────────────────────

function sortByTime(races: RaceEntry[]): RaceEntry[] {
  return [...races].sort((a, b) => {
    // 시간 없으면 맨 뒤
    if (!a.time && !b.time) return 0
    if (!a.time) return 1
    if (!b.time) return -1
    return a.time.localeCompare(b.time)
  })
}

// ─── 데스크탑: 셀 내 종목 칩 (모바일과 동일한 색상 배경 + 장소 + 시간 형태) ──

interface RaceRowProps {
  race: RaceEntry
  onClick: () => void
}

const RaceRow = ({race, onClick}: RaceRowProps) => {
  const color = getRaceBoxColor(race)
  return (
    <Tooltip
      placement="top"
      title={
        <Stack spacing={0.25}>
          {race.time && <Box>{race.time}</Box>}
          <Box>{race.venue}</Box>
          <Box>{race.category}</Box>
        </Stack>
      }>
      <Box
        role="button"
        tabIndex={0}
        onClick={e => { e.stopPropagation(); onClick() }}
        onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !e.nativeEvent.isComposing) { e.preventDefault(); onClick() } }}
        aria-label={`${race.category} ${race.time} ${race.venue}`}
        sx={{
          cursor: 'pointer', mb: 0.3,
          px: 0.5, py: 0.3, borderRadius: 0.75,
          bgcolor: color,
          '&:hover': {opacity: 0.85},
          transition: 'opacity 0.1s',
          overflow: 'hidden',
        }}>
        {/* 장소 — 최대 2줄 */}
        {race.venue && (
          <Typography sx={{
            fontSize: '0.6rem', fontWeight: 600, color: '#fff',
            lineHeight: 1.25,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {race.venue}
          </Typography>
        )}
        {/* 시간 */}
        {race.time && (
          <Typography sx={{
            fontSize: '0.55rem', color: 'rgba(255,255,255,0.85)',
            lineHeight: 1.2, whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis',
            mt: race.venue ? 0.2 : 0,
          }}>
            {race.time}
          </Typography>
        )}
      </Box>
    </Tooltip>
  )
}

// ─── 모바일: 하단 드로어의 대회 행 ────────────────────────────────────────────

const MobileRaceRow = ({race, onClick}: RaceRowProps) => (
  <Box
    role="button"
    tabIndex={0}
    aria-label={`${race.category} ${race.time} ${race.venue}`}
    onClick={onClick}
    onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !e.nativeEvent.isComposing) { e.preventDefault(); onClick() } }}
    sx={{
      display: 'flex', alignItems: 'center', gap: 1.5,
      px: 2, py: 1.25, cursor: 'pointer',
      '&:hover': {bgcolor: 'action.hover'},
      '&:focus-visible': {outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2},
      borderBottom: '1px solid', borderColor: 'divider',
    }}>
    <Box sx={{minWidth: 40, textAlign: 'center'}}>
      <Typography variant="caption" sx={{fontWeight: 700, color: 'primary.main', fontSize: '0.82rem'}}>
        {race.time || '-'}
      </Typography>
    </Box>
    <Box sx={{flex: 1, minWidth: 0}}>
      <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap" sx={{mb: 0.25}}>
        <CategoryChip category={race.category} />
        {(() => {
          const type = getRaceType(race.title)
          if (type === 'station') return null
          return (
            <Box sx={{
              px: 0.6, py: 0.1, borderRadius: 0.5,
              bgcolor: RACE_TYPE_COLOR[type],
              display: 'inline-flex', alignItems: 'center',
            }}>
              <Typography sx={{fontSize: '0.6rem', fontWeight: 700, color: '#fff', lineHeight: 1.3}}>
                {RACE_TYPE_LABEL[type]}
              </Typography>
            </Box>
          )
        })()}
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{fontSize: '0.75rem'}}>
        📍 {race.venue}
      </Typography>
    </Box>
  </Box>
)

// ─── 모바일: 하단 드로어 — 시간대 × 경기장 매트릭스 ─────────────────────────

interface DrawerRaceMatrixProps {
  races: RaceEntry[]
  onRaceClick: (race: RaceEntry) => void
}

const DrawerRaceMatrix = ({races, onRaceClick}: DrawerRaceMatrixProps) => {
  // 시간대 목록 (정렬됨, 빈 시간은 "-" 로 통합)
  const times = [...new Set(races.map(r => r.time || '-'))].sort((a, b) => {
    if (a === '-') return 1
    if (b === '-') return -1
    return a.localeCompare(b)
  })

  // 경기장 목록 (등장 순서 유지)
  const venues = [...new Set(races.map(r => r.venue))]

  // 경기장이 1개거나 시간대가 1개면 단순 리스트로 폴백
  if (venues.length <= 1 || times.length <= 1) {
    return (
      <>
        {races.map(race => (
          <MobileRaceRow key={race.id} race={race} onClick={() => onRaceClick(race)} />
        ))}
      </>
    )
  }

  // 빠른 조회용 맵: "time|venue" → RaceEntry[]
  const index = new Map<string, RaceEntry[]>()
  races.forEach(r => {
    const key = `${r.time || '-'}|${r.venue}`
    const arr = index.get(key) ?? []
    arr.push(r)
    index.set(key, arr)
  })

  // 경기장 열 너비: 균등 분할하되 최소 72px 보장
  const colWidth = `minmax(72px, 1fr)`
  const gridCols = `48px repeat(${venues.length}, ${colWidth})`

  // 시간 열 sticky 스타일 — overflow 컨테이너 기준으로 왼쪽에 고정
  const timeCellSx = {
    position: 'sticky' as const,
    left: 0,
    zIndex: 1,
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    bgcolor: 'background.paper', // 스크롤 시 뒤 콘텐츠 차단 — 반드시 불투명해야 함
    borderRight: '1px solid',
    borderColor: 'divider',
    pl: 1.5,
    pr: 0.5,
    fontSize: '0.7rem', fontWeight: 700, color: 'primary.main',
    lineHeight: 1.2,
  }

  return (
    // px: 0 필수 — 패딩이 있으면 sticky left:0이 패딩 안쪽에서 동작해 스크롤 시 겹침 발생
    <Box sx={{px: 0, py: 1, overflowX: 'auto'}}>
      <Box sx={{minWidth: 48 + venues.length * 72, pr: 1.5}}>
        {/* 경기장 헤더 행 */}
        <Box sx={{display: 'grid', gridTemplateColumns: gridCols, gap: 0.5, mb: 0.5}}>
          {/* 시간 열 헤더 — sticky */}
          <Box sx={timeCellSx} />
          {venues.map(venue => (
            <Typography key={venue} sx={{
              fontSize: '0.6rem', fontWeight: 700, color: 'text.secondary',
              textAlign: 'center', lineHeight: 1.3,
              overflow: 'hidden', textOverflow: 'ellipsis',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
              {venue}
            </Typography>
          ))}
        </Box>

        {/* 시간대별 행 */}
        {times.map(time => (
          <Box key={time} sx={{display: 'grid', gridTemplateColumns: gridCols, gap: 0.5, mb: 0.5, alignItems: 'center'}}>
            {/* 시간 열 — sticky left */}
            <Typography sx={timeCellSx}>{time}</Typography>

            {/* 경기장별 셀 */}
            {venues.map(venue => {
              const key = `${time}|${venue}`
              const cell = index.get(key) ?? []
              return (
                <Box key={venue} sx={{display: 'flex', flexDirection: 'column', gap: 0.3}}>
                  {cell.length > 0 ? (
                    cell.map(race => (
                      <Box
                        key={race.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`${race.category} ${race.time} ${race.venue}`}
                        onClick={() => onRaceClick(race)}
                        onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !e.nativeEvent.isComposing) { e.preventDefault(); onRaceClick(race) } }}
                        sx={{
                          px: 0.5, py: 0.4, borderRadius: 0.75, cursor: 'pointer',
                          bgcolor: getRaceBoxColor(race),
                          '&:hover': {opacity: 0.85},
                          '&:focus-visible': {outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 1},
                          transition: 'opacity 0.1s',
                        }}>
                        <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.3}>
                          {(() => {
                            const type = getRaceType(race.title)
                            if (type === 'station') return null
                            return (
                              <Box sx={{
                                width: 5, height: 5, borderRadius: '50%',
                                bgcolor: 'rgba(255,255,255,0.9)', flexShrink: 0,
                                boxShadow: `0 0 0 1.5px ${RACE_TYPE_COLOR[type]}`,
                              }} />
                            )
                          })()}
                          <Typography sx={{
                            fontSize: '0.6rem', fontWeight: 700, color: '#fff',
                            lineHeight: 1.3, textAlign: 'center',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {race.category.replace(' 클래스', '')}
                          </Typography>
                        </Stack>
                      </Box>
                    ))
                  ) : (
                    <Box sx={{height: 24}} />
                  )}
                </Box>
              )
            })}
          </Box>
        ))}
      </Box>
    </Box>
  )
}

// ─── 모바일: 셀 내 소형 종목 칩 (장소 + 시간 포함) ──────────────────────────

interface MobileRaceChipProps {
  race: RaceEntry
}

const MobileRaceChip = ({race}: MobileRaceChipProps) => {
  const {category, time, venue} = race
  const color = getRaceBoxColor(race)
  return (
    <Box sx={{px: 0.4, py: 0.2, borderRadius: 0.5, bgcolor: color, overflow: 'hidden'}}>
      {/* 장소 — 최대 2줄 */}
      {venue && (
        <Typography sx={{
          fontSize: '0.5rem', fontWeight: 600, color: '#fff',
          lineHeight: 1.25,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {venue}
        </Typography>
      )}
      {/* 시간 */}
      {time && (
        <Typography sx={{
          fontSize: '0.48rem', color: 'rgba(255,255,255,0.85)',
          lineHeight: 1.2, whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis',
          mt: venue ? 0.2 : 0,
        }}>
          {time}
        </Typography>
      )}
    </Box>
  )
}

// ─── 데스크탑 날짜 셀 ─────────────────────────────────────────────────────────

interface DayCellDesktopProps {
  day: Date
  dayRaces: RaceEntry[]
  regStartRaces: RaceEntry[]
  inMonth: boolean
  todayFlag: boolean
  isPastDay: boolean
  dayNum: number
  isSelected: boolean
  onSelect: () => void
  onRaceClick: (race: RaceEntry) => void
}

const CELL_HEIGHT_DESKTOP = 140

const DayCellDesktop = ({
  day, dayRaces, regStartRaces, inMonth, todayFlag, isPastDay, dayNum,
  isSelected, onSelect, onRaceClick,
}: DayCellDesktopProps) => {
  const visibleRaces = dayRaces.slice(0, MAX_SHOW)
  const overCount = dayRaces.length - MAX_SHOW
  const hasMore = overCount > 0

  return (
    <Paper
      square
      elevation={0}
      role={inMonth ? 'button' : undefined}
      tabIndex={inMonth ? 0 : undefined}
      aria-label={inMonth ? `${format(day, 'M월 d일')} ${dayRaces.length}개 일정` : undefined}
      onClick={inMonth ? onSelect : undefined}
      onKeyDown={inMonth ? e => { if ((e.key === 'Enter' || e.key === ' ') && !e.nativeEvent.isComposing) { e.preventDefault(); onSelect() } } : undefined}
      sx={{
        height: CELL_HEIGHT_DESKTOP,
        p: 0.5, display: 'flex', flexDirection: 'column',
        bgcolor: isSelected ? 'action.selected' : todayFlag ? 'action.selected' : inMonth ? 'background.paper' : 'action.disabledBackground',
        borderRight: '1px solid', borderBottom: '1px solid', borderColor: 'divider',
        opacity: !inMonth ? 0.35 : isPastDay ? 0.45 : 1,
        overflow: 'hidden', position: 'relative',
        cursor: inMonth ? 'pointer' : 'default',
        outline: isSelected ? '2px solid' : 'none',
        outlineColor: 'primary.main',
        transition: 'background-color 0.1s',
        '&:hover': inMonth ? {bgcolor: isSelected ? 'action.selected' : 'action.hover'} : {},
        '&:focus-visible': inMonth ? {outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2} : {},
      }}>
      <Typography
        variant="caption"
        sx={{
          display: 'block', textAlign: 'right', fontWeight: todayFlag ? 800 : 500,
          fontSize: '0.78rem', lineHeight: 1.4, mb: 0.25, flexShrink: 0,
          color: todayFlag ? 'primary.main' : dayNum === 0 ? 'error.main' : dayNum === 6 ? 'primary.light' : 'text.primary',
        }}>
        {format(day, 'd')}
      </Typography>
      <Box sx={{flex: 1, overflow: 'hidden'}}>
        {visibleRaces.map(race => (
          <RaceRow key={race.id} race={race} onClick={() => onRaceClick(race)} />
        ))}
      </Box>
      {hasMore && (
        <Typography variant="caption" sx={{fontSize: '0.65rem', color: 'primary.main', lineHeight: 1, flexShrink: 0, mt: 0.25}}>
          +{overCount}건 더보기
        </Typography>
      )}
      {/* 접수 시작일 — 도트 + 지점명 + "접수 시작일" */}
      {regStartRaces.length > 0 && (() => {
        const venueMap = new Map(regStartRaces.map((r): [string, RaceEntry] => [r.venue, r]))
        return Array.from(venueMap.entries()).map(([venue, rep]) => (
          <Box
            key={`reg-${venue}`}
            role="button"
            tabIndex={0}
            aria-label={`${venue} 접수 시작 상세 보기`}
            onClick={e => { e.stopPropagation(); onRaceClick(rep) }}
            onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !e.nativeEvent.isComposing) { e.preventDefault(); onRaceClick(rep) } }}
            sx={{
              mt: 0.3, display: 'flex', alignItems: 'center', gap: 0.4,
              cursor: 'pointer', flexShrink: 0,
              '&:hover .reg-label': {textDecoration: 'underline'},
              '&:focus-visible': {outline: '2px solid', outlineColor: 'warning.dark', borderRadius: 0.5},
            }}>
            {/* 도트 */}
            <Box sx={{width: 6, height: 6, borderRadius: '50%', bgcolor: 'warning.main', flexShrink: 0}} />
            {/* 지점명 + 접수 시작일 */}
            <Typography
              className="reg-label"
              sx={{
                fontSize: '0.58rem', color: 'warning.dark', fontWeight: 600,
                lineHeight: 1.2, wordBreak: 'break-all',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
              {venue} 접수
            </Typography>
          </Box>
        ))
      })()}
    </Paper>
  )
}

// ─── 모바일 날짜 셀 ───────────────────────────────────────────────────────────

interface DayCellMobileProps {
  regStartRaces: RaceEntry[]
  day: Date
  dayRaces: RaceEntry[]
  inMonth: boolean
  todayFlag: boolean
  isPastDay: boolean
  dayNum: number
  isSelected: boolean
  onSelect: () => void
  onRaceClick: (race: RaceEntry) => void
}

const DayCellMobile = ({
  day, dayRaces, regStartRaces, inMonth, todayFlag, isPastDay, dayNum,
  isSelected, onSelect, onRaceClick,
}: DayCellMobileProps) => {
  const MAX_VISIBLE = 3
  const visible = dayRaces.slice(0, MAX_VISIBLE)
  const extra = dayRaces.length - MAX_VISIBLE

  return (
    <Paper
      square
      elevation={0}
      role={inMonth ? 'button' : undefined}
      tabIndex={inMonth ? 0 : undefined}
      aria-label={inMonth ? `${format(day, 'M월 d일')} ${dayRaces.length}개 일정` : undefined}
      onClick={inMonth ? onSelect : undefined}
      onKeyDown={inMonth ? e => { if ((e.key === 'Enter' || e.key === ' ') && !e.nativeEvent.isComposing) { e.preventDefault(); onSelect() } } : undefined}
      sx={{
        minHeight: 56, height: '100%', boxSizing: 'border-box',
        px: '3px', pt: '4px', pb: '4px',
        display: 'flex', flexDirection: 'column', alignItems: 'stretch',
        bgcolor: isSelected ? 'action.focus' : todayFlag ? 'action.selected' : inMonth ? 'background.paper' : 'action.disabledBackground',
        borderRight: '1px solid', borderBottom: '1px solid', borderColor: 'divider',
        outline: isSelected ? '2px solid' : 'none',
        outlineColor: 'primary.main',
        outlineOffset: -2,
        opacity: !inMonth ? 0.3 : isPastDay ? 0.45 : 1,
        cursor: inMonth ? 'pointer' : 'default',
        transition: 'background-color 0.1s',
        '&:hover': inMonth ? {bgcolor: isSelected ? 'action.focus' : 'action.hover'} : {},
        '&:focus-visible': inMonth ? {outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2} : {},
      }}>

      {/* 날짜 숫자 — 오늘은 원형 배경 */}
      <Box sx={{display: 'flex', justifyContent: 'center', mb: 0.4, flexShrink: 0}}>
        <Box sx={{
          width: 22, height: 22,
          borderRadius: todayFlag ? '50%' : 0,
          bgcolor: todayFlag ? 'primary.main' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.72rem', fontWeight: todayFlag || isSelected ? 800 : 400, lineHeight: 1,
              color: todayFlag ? '#fff'
                : dayNum === 0 ? 'error.main'
                : dayNum === 6 ? 'primary.light'
                : 'text.primary',
            }}>
            {format(day, 'd')}
          </Typography>
        </Box>
      </Box>

      {/* 종목 칩 — 가변 높이, 최대 3개 */}
      <Box sx={{display: 'flex', flexDirection: 'column', gap: 0.3}}>
        {visible.map(race => (
          <MobileRaceChip key={race.id} race={race} />
        ))}
        {extra > 0 && (
          <Typography sx={{
            fontSize: '0.52rem', lineHeight: 1.2, textAlign: 'center',
            color: 'text.disabled',
          }}>
            +{extra}
          </Typography>
        )}
        {/* 접수 시작 — 경기장별 전체 표시, 데스크탑과 동일 패턴 */}
        {regStartRaces.length > 0 && (() => {
          const venueMap = new Map(regStartRaces.map((r): [string, RaceEntry] => [r.venue, r]))
          return Array.from(venueMap.entries()).map(([venue, rep]) => (
            <Box
              key={`reg-${venue}`}
              role="button"
              tabIndex={0}
              aria-label={`${venue} 접수 시작 상세 보기`}
              onClick={e => { e.stopPropagation(); onRaceClick(rep) }}
              onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !e.nativeEvent.isComposing) { e.preventDefault(); onRaceClick(rep) } }}
              sx={{mt: 0.3, display: 'flex', alignItems: 'center', gap: 0.35, cursor: 'pointer', '&:hover .reg-label': {textDecoration: 'underline'}, '&:focus-visible': {outline: '2px solid', outlineColor: 'warning.dark', borderRadius: 0.4}}}>
              <Box sx={{width: 5, height: 5, borderRadius: '50%', bgcolor: 'warning.main', flexShrink: 0}} />
              <Typography
                className="reg-label"
                sx={{
                  fontSize: '0.44rem', color: 'warning.dark', fontWeight: 600,
                  lineHeight: 1.2, wordBreak: 'break-all',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                {venue} 접수
              </Typography>
            </Box>
          ))
        })()}
      </Box>
    </Paper>
  )
}

// ─── 색상 가이드 ──────────────────────────────────────────────────────────────

const ColorLegend = () => (
  <Box sx={{mt: 1.5, px: 0.5}}>
    <Typography variant="caption" sx={{fontSize: '0.68rem', color: 'text.disabled', display: 'block', mb: 0.5}}>
      색상 안내
    </Typography>
    <Stack direction="row" flexWrap="wrap" gap={1}>
      {/* 클래스 색상 */}
      {CLASS_LIST.map(cls => (
        <Stack key={cls.key} direction="row" alignItems="center" spacing={0.5}>
          <Box sx={{width: 10, height: 10, borderRadius: '50%', bgcolor: cls.color, flexShrink: 0}} />
          <Typography variant="caption" sx={{fontSize: '0.68rem', color: 'text.secondary'}}>
            {cls.label}
          </Typography>
        </Stack>
      ))}
      {/* 대회 유형 색상 */}
      {(['world', 'asia'] as const).map(type => (
        <Stack key={type} direction="row" alignItems="center" spacing={0.5}>
          <Box sx={{width: 10, height: 10, borderRadius: '50%', bgcolor: RACE_TYPE_COLOR[type], flexShrink: 0}} />
          <Typography variant="caption" sx={{fontSize: '0.68rem', color: 'text.secondary'}}>
            {RACE_TYPE_LABEL[type]}
          </Typography>
        </Stack>
      ))}
    </Stack>
  </Box>
)

// ─── 월 캘린더 ────────────────────────────────────────────────────────────────

export const CalendarMonth = ({races, onRaceClick}: CalendarMonthProps) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [current, setCurrent] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const monthStart = startOfMonth(current)
  const monthEnd = endOfMonth(current)
  const calStart = startOfWeek(monthStart, {weekStartsOn: 0})
  const calEnd = endOfWeek(monthEnd, {weekStartsOn: 0})
  const days = eachDayOfInterval({start: calStart, end: calEnd})

  const racesByDate = new Map<string, RaceEntry[]>()
  races.forEach(r => {
    const arr = racesByDate.get(r.date) ?? []
    arr.push(r)
    racesByDate.set(r.date, arr)
  })
  // 날짜별 시간순 정렬
  racesByDate.forEach((arr, key) => racesByDate.set(key, sortByTime(arr)))

  // 접수 시작일 → 해당 경기 목록 맵
  const regStartByDate = new Map<string, RaceEntry[]>()
  races.forEach(r => {
    if (!r.registrationStartDate) return
    const arr = regStartByDate.get(r.registrationStartDate) ?? []
    arr.push(r)
    regStartByDate.set(r.registrationStartDate, arr)
  })

  const prev = () => {
    setSelectedDate(null)
    setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }
  const next = () => {
    setSelectedDate(null)
    setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }

  const selectedRaces = selectedDate ? (racesByDate.get(selectedDate) ?? []) : []
  // 선택된 날짜가 접수 시작일인 경기들 (드로어에 함께 표시)
  const selectedRegStartRaces = selectedDate ? (regStartByDate.get(selectedDate) ?? []) : []
  const selectedDateObj = selectedDate ? new Date(selectedDate.replace(/\./g, '-')) : null

  return (
    <Box>
      {/* 헤더 */}
      <Stack direction="row" alignItems="center" sx={{mb: 1.5}}>
        <IconButton size="small" onClick={prev} aria-label="이전 달"><ChevronLeftIcon /></IconButton>
        <Typography variant="subtitle1" sx={{fontWeight: 700, mx: 1, minWidth: 110, textAlign: 'center'}}>
          {format(current, 'yyyy년 M월', {locale: ko})}
        </Typography>
        <IconButton size="small" onClick={next} aria-label="다음 달"><ChevronRightIcon /></IconButton>
        {!isMobile && (
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ml: 'auto'}}>
            <HowToRegIcon sx={{fontSize: 12, color: 'text.disabled'}} />
            <Typography variant="caption" sx={{fontSize: '0.68rem', color: 'text.disabled'}}>접수 정보 있음</Typography>
          </Stack>
        )}
      </Stack>

      {/* 요일 헤더 */}
      <Box sx={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 0.5}}>
        {DAY_HEADERS.map((d, i) => (
          <Typography key={d} variant="caption" sx={{display: 'block', textAlign: 'center', fontWeight: 600, fontSize: {xs: '0.65rem', sm: '0.75rem'}, color: i === 0 ? 'error.main' : i === 6 ? 'primary.main' : 'text.secondary', pb: 0.5}}>
            {d}
          </Typography>
        ))}
      </Box>

      {/* 날짜 그리드 */}
      <Box sx={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', alignItems: 'stretch', border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden'}}>
        {days.map(day => {
          const dateKey = format(day, 'yyyy.MM.dd')
          const dayRaces = racesByDate.get(dateKey) ?? []
          const regStartRaces = regStartByDate.get(dateKey) ?? []
          const todayFlag = isToday(day)
          const isPastDay = !todayFlag && isPast(startOfDay(day))
          const inMonth = isSameMonth(day, current)

          if (isMobile) {
            return (
              <DayCellMobile
                key={dateKey}
                day={day}
                dayRaces={dayRaces}
                regStartRaces={regStartRaces}
                inMonth={inMonth}
                todayFlag={todayFlag}
                isPastDay={isPastDay}
                dayNum={day.getDay()}
                isSelected={selectedDate === dateKey}
                onSelect={() => {
                  // 경기 또는 접수 경기가 있을 때만 드로어 오픈
                  if (dayRaces.length > 0 || regStartRaces.length > 0) {
                    setSelectedDate(selectedDate === dateKey ? null : dateKey)
                  }
                }}
                onRaceClick={onRaceClick}
              />
            )
          }

          return (
            <DayCellDesktop
              key={dateKey}
              day={day}
              dayRaces={dayRaces}
              regStartRaces={regStartRaces}
              inMonth={inMonth}
              todayFlag={todayFlag}
              isPastDay={isPastDay}
              dayNum={day.getDay()}
              isSelected={selectedDate === dateKey}
              onSelect={() => {
                if (dayRaces.length === 1 && dayRaces[0]) {
                  // 단일 대회: 바로 상세 오픈
                  onRaceClick(dayRaces[0])
                } else if (dayRaces.length > 1) {
                  // 복수 대회: 드로어로 목록 표시
                  setSelectedDate(selectedDate === dateKey ? null : dateKey)
                }
              }}
              onRaceClick={onRaceClick}
            />
          )
        })}
      </Box>

      {/* 색상 가이드 */}
      <ColorLegend />

      {/* 날짜 선택 시 하단 드로어 — 모바일: 항상, 데스크탑: 복수 경기장이 있을 때만 */}
      {(isMobile || (!isMobile && selectedRaces.length > 1)) && (
        <Drawer
          anchor="bottom"
          open={Boolean(selectedDate && (selectedRaces.length > 0 || selectedRegStartRaces.length > 0))}
          onClose={() => setSelectedDate(null)}
          slotProps={{paper: {sx: {borderRadius: '16px 16px 0 0', maxHeight: '60vh'}}}}>
          {/* 드로어 핸들 */}
          <Box sx={{display: 'flex', justifyContent: 'center', pt: 1, pb: 0.5}}>
            <Box sx={{width: 36, height: 4, borderRadius: 2, bgcolor: 'divider'}} />
          </Box>

          {/* 날짜 헤더 */}
          <Stack direction="row" alignItems="center" sx={{px: 2, pb: 1}}>
            <Box>
              <Typography variant="subtitle1" sx={{fontWeight: 700, lineHeight: 1.2}}>
                {selectedDateObj && format(selectedDateObj, 'M월 d일', {locale: ko})}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {selectedDateObj && format(selectedDateObj, 'EEE', {locale: ko})} · {selectedRaces.length}개 일정{selectedRegStartRaces.length > 0 ? ` · 접수 ${new Set(selectedRegStartRaces.map(r => r.venue)).size}개소` : ''}
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setSelectedDate(null)} aria-label="닫기" sx={{ml: 'auto'}}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>

          <Divider />

          <Box sx={{overflowY: 'auto'}}>
            {/* ── 접수 섹션 ── */}
            {selectedRegStartRaces.length > 0 && (() => {
              const venueMap = new Map(selectedRegStartRaces.map((r): [string, RaceEntry] => [r.venue, r]))
              const raceYear = selectedDate ? parseInt(selectedDate.split('.')[0] ?? '', 10) || undefined : undefined
              const items = Array.from(venueMap.entries()).map(([venue, rep]) => {
                const status = getRegistrationStatus(rep.registrationDeadlineRaw ?? '', raceYear)
                return {venue, rep, status}
              })
              const defaultColor = '#e65100'
              return (
                <Box sx={{px: 1.5, pt: 1.5, pb: selectedRaces.length > 0 ? 0 : 1}}>
                  {/* 섹션 헤더 — 경기도 있을 때만 표시해서 맥락 구분 */}
                  {selectedRaces.length > 0 && (
                    <Typography variant="caption" sx={{fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 0.5}}>
                      접수 정보
                    </Typography>
                  )}
                  {items.map(({venue, rep, status}) => {
                    const color = status ? REGISTRATION_STATUS_COLOR[status] : defaultColor
                    const label = status ? REGISTRATION_STATUS_LABEL[status] : null
                    return (
                      <Box
                        key={`drawer-reg-${venue}`}
                        role="button"
                        tabIndex={0}
                        aria-label={`${venue} 접수 상세 보기`}
                        onClick={() => { onRaceClick(rep); setSelectedDate(null) }}
                        onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !e.nativeEvent.isComposing) { e.preventDefault(); onRaceClick(rep); setSelectedDate(null) } }}
                        sx={{
                          mb: 0.75, px: 1, py: 0.75, borderRadius: 1.5, cursor: 'pointer',
                          border: '1px solid', borderColor: color, bgcolor: `${color}18`,
                          display: 'flex', alignItems: 'center', gap: 1,
                          '&:hover': {bgcolor: `${color}30`},
                          '&:focus-visible': {outline: '2px solid', outlineColor: color},
                          transition: 'background-color 0.1s',
                        }}>
                        <Box sx={{width: 7, height: 7, borderRadius: '50%', bgcolor: color, flexShrink: 0}} />
                        <Box sx={{flex: 1, minWidth: 0}}>
                          <Typography variant="caption" sx={{fontWeight: 700, color, display: 'block', fontSize: '0.73rem'}}>
                            {venue}{label ? ` · ${label}` : ''}
                          </Typography>
                          <Typography variant="caption" sx={{color: 'text.secondary', fontSize: '0.68rem'}}>
                            {rep.category} · 경기일 {format(new Date(rep.date.replace(/\./g, '-')), 'M/d', {locale: ko})}
                          </Typography>
                        </Box>
                      </Box>
                    )
                  })}
                </Box>
              )
            })()}

            {/* ── 경기 섹션 ── */}
            {selectedRaces.length > 0 && (
              <>
                {selectedRegStartRaces.length > 0 && (
                  <Box sx={{px: 1.5, pb: 0.5}}>
                    <Divider sx={{mb: 1}} />
                    <Typography variant="caption" sx={{fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 0.5}}>
                      경기 일정
                    </Typography>
                  </Box>
                )}
                <DrawerRaceMatrix
                  races={selectedRaces}
                  onRaceClick={onRaceClick}
                />
              </>
            )}
          </Box>
        </Drawer>
      )}
    </Box>
  )
}
