import {useState} from 'react'
import {
  Box, Typography, Paper, Stack, IconButton, Tooltip,
  useMediaQuery, Drawer, Divider,
} from '@mui/material'
import {useTheme} from '@mui/material/styles'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import HowToRegIcon from '@mui/icons-material/HowToReg'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import CloseIcon from '@mui/icons-material/Close'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, isPast, startOfDay,
} from 'date-fns'
import {ko} from 'date-fns/locale'
import type {RaceEntry} from '@/entities/race'
import {CLASS_LIST, getCategoryColor} from '@/entities/race'
import {CategoryChip} from '@/entities/race'

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

// ─── 데스크탑: 상세 대회 행 ────────────────────────────────────────────────────

interface RaceRowProps {
  race: RaceEntry
  onClick: () => void
}

const RaceRow = ({race, onClick}: RaceRowProps) => {
  const hasDetail = Boolean(race.detailUrl)
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
        onClick={onClick}
        sx={{
          cursor: 'pointer', mb: 0.3, px: 0.5, py: 0.2,
          borderRadius: 0.75, bgcolor: 'action.hover',
          '&:hover': {bgcolor: 'action.selected'},
          transition: 'background-color 0.1s',
        }}>
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{mb: 0.2}}>
          <CategoryChip category={race.category} />
          {hasDetail && <HowToRegIcon sx={{fontSize: 11, color: 'text.disabled', flexShrink: 0}} />}
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.3} sx={{overflow: 'hidden'}}>
          {race.time && (
            <Stack direction="row" alignItems="center" spacing={0.2} sx={{flexShrink: 0}}>
              <AccessTimeIcon sx={{fontSize: 9, color: 'text.disabled'}} />
              <Typography variant="caption" sx={{fontSize: '0.62rem', color: 'text.secondary', lineHeight: 1}}>
                {race.time}
              </Typography>
            </Stack>
          )}
          <Stack direction="row" alignItems="center" spacing={0.2} sx={{overflow: 'hidden', minWidth: 0}}>
            <LocationOnIcon sx={{fontSize: 9, color: 'text.disabled', flexShrink: 0}} />
            <Typography variant="caption" sx={{fontSize: '0.62rem', color: 'text.disabled', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
              {race.venue}
            </Typography>
          </Stack>
        </Stack>
      </Box>
    </Tooltip>
  )
}

// ─── 모바일: 하단 드로어의 대회 행 ────────────────────────────────────────────

const MobileRaceRow = ({race, onClick}: RaceRowProps) => (
  <Box
    onClick={onClick}
    sx={{
      display: 'flex', alignItems: 'center', gap: 1.5,
      px: 2, py: 1.25, cursor: 'pointer',
      '&:hover': {bgcolor: 'action.hover'},
      borderBottom: '1px solid', borderColor: 'divider',
    }}>
    <Box sx={{minWidth: 40, textAlign: 'center'}}>
      <Typography variant="caption" sx={{fontWeight: 700, color: 'primary.main', fontSize: '0.82rem'}}>
        {race.time || '-'}
      </Typography>
    </Box>
    <Box sx={{flex: 1, minWidth: 0}}>
      <Stack direction="row" alignItems="center" spacing={0.75} sx={{mb: 0.25}}>
        <CategoryChip category={race.category} />
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
    bgcolor: 'background.paper',
    fontSize: '0.7rem', fontWeight: 700, color: 'primary.main',
    textAlign: 'center', lineHeight: 1.2,
    // 헤더 행의 빈 칸도 같은 스타일 적용을 위해 재사용
  }

  return (
    // 항상 overflow-x: auto — sticky 동작에 필요
    <Box sx={{px: 0, py: 1, overflowX: 'auto'}}>
      {/* 최소 너비: 시간열 + 경기장 수 × 72px */}
      <Box sx={{minWidth: 48 + venues.length * 72, px: 1.5}}>
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
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRaceClick(race) } }}
                        sx={{
                          px: 0.5, py: 0.4, borderRadius: 0.75, cursor: 'pointer',
                          bgcolor: getCategoryColor(race.category),
                          '&:hover': {opacity: 0.85},
                          '&:focus-visible': {outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 1},
                          transition: 'opacity 0.1s',
                        }}>
                        <Typography sx={{
                          fontSize: '0.6rem', fontWeight: 700, color: '#fff',
                          lineHeight: 1.3, textAlign: 'center',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {race.category.replace(' 클래스', '')}
                        </Typography>
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
  category: string
  time: string
  venue: string
}

const MobileRaceChip = ({category, time, venue}: MobileRaceChipProps) => {
  const color = getCategoryColor(category)
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
  inMonth: boolean
  todayFlag: boolean
  isPastDay: boolean
  dayNum: number
  expanded: boolean
  onToggleExpand: () => void
  onRaceClick: (race: RaceEntry) => void
}

const CELL_HEIGHT_DESKTOP = 140

const DayCellDesktop = ({
  day, dayRaces, inMonth, todayFlag, isPastDay, dayNum,
  expanded, onToggleExpand, onRaceClick,
}: DayCellDesktopProps) => {
  const overCount = dayRaces.length - MAX_SHOW
  const hasMore = overCount > 0
  const visibleRaces = expanded ? dayRaces : dayRaces.slice(0, MAX_SHOW)

  return (
    <Paper
      square
      elevation={0}
      sx={{
        height: expanded ? 'auto' : CELL_HEIGHT_DESKTOP,
        minHeight: expanded ? CELL_HEIGHT_DESKTOP : undefined,
        p: 0.5, display: 'flex', flexDirection: 'column',
        bgcolor: todayFlag ? 'action.selected' : inMonth ? 'background.paper' : 'action.disabledBackground',
        borderRight: '1px solid', borderBottom: '1px solid', borderColor: 'divider',
        opacity: !inMonth ? 0.35 : isPastDay ? 0.45 : 1,
        overflow: 'hidden', position: 'relative',
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
        <Box
          onClick={e => {e.stopPropagation(); onToggleExpand()}}
          sx={{display: 'flex', alignItems: 'center', gap: 0.25, cursor: 'pointer', mt: 0.25, flexShrink: 0, '&:hover .more-text': {textDecoration: 'underline'}}}>
          {expanded ? <ExpandLessIcon sx={{fontSize: 12, color: 'primary.main'}} /> : <ExpandMoreIcon sx={{fontSize: 12, color: 'primary.main'}} />}
          <Typography className="more-text" variant="caption" sx={{fontSize: '0.65rem', color: 'primary.main', lineHeight: 1}}>
            {expanded ? '접기' : `+${overCount}건 더보기`}
          </Typography>
        </Box>
      )}
    </Paper>
  )
}

// ─── 모바일 날짜 셀 ───────────────────────────────────────────────────────────

interface DayCellMobileProps {
  day: Date
  dayRaces: RaceEntry[]
  inMonth: boolean
  todayFlag: boolean
  isPastDay: boolean
  dayNum: number
  isSelected: boolean
  onSelect: () => void
}

const DayCellMobile = ({
  day, dayRaces, inMonth, todayFlag, isPastDay, dayNum,
  isSelected, onSelect,
}: DayCellMobileProps) => {
  const MAX_VISIBLE = 3
  const visible = dayRaces.slice(0, MAX_VISIBLE)
  const extra = dayRaces.length - MAX_VISIBLE

  return (
    <Paper
      square
      elevation={0}
      onClick={inMonth ? onSelect : undefined}
      sx={{
        minHeight: 56, height: '100%', boxSizing: 'border-box',
        px: '3px', pt: '4px', pb: '4px',
        display: 'flex', flexDirection: 'column', alignItems: 'stretch',
        bgcolor: isSelected ? 'primary.main' : todayFlag ? 'action.selected' : inMonth ? 'background.paper' : 'action.disabledBackground',
        borderRight: '1px solid', borderBottom: '1px solid', borderColor: 'divider',
        opacity: !inMonth ? 0.3 : isPastDay ? 0.45 : 1,
        cursor: inMonth ? 'pointer' : 'default',
        transition: 'background-color 0.1s',
        '&:hover': inMonth ? {bgcolor: isSelected ? 'primary.dark' : 'action.hover'} : {},
      }}>

      {/* 날짜 숫자 — 오늘은 원형 배경 */}
      <Box sx={{display: 'flex', justifyContent: 'center', mb: 0.4, flexShrink: 0}}>
        <Box sx={{
          width: 22, height: 22,
          borderRadius: todayFlag ? '50%' : 0,
          bgcolor: todayFlag && !isSelected ? 'primary.main' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.72rem', fontWeight: todayFlag || isSelected ? 800 : 400, lineHeight: 1,
              color: isSelected
                ? '#fff'
                : todayFlag ? '#fff'
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
          <MobileRaceChip key={race.id} category={race.category} time={race.time} venue={race.venue} />
        ))}
        {extra > 0 && (
          <Typography sx={{
            fontSize: '0.52rem', lineHeight: 1.2, textAlign: 'center',
            color: isSelected ? 'rgba(255,255,255,0.8)' : 'text.disabled',
          }}>
            +{extra}
          </Typography>
        )}
      </Box>
    </Paper>
  )
}

// ─── 오늘의 대회 헤더 ─────────────────────────────────────────────────────────

interface TodayRaceHeaderProps {
  todayRaces: RaceEntry[]
  onRaceClick: (race: RaceEntry) => void
}

const TodayRaceHeader = ({todayRaces, onRaceClick}: TodayRaceHeaderProps) => (
  <Box sx={{mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 2, border: '1px solid', borderColor: 'divider'}}>
    <Stack direction="row" alignItems="center" spacing={0.5} sx={{mb: 1}}>
      <EmojiEventsIcon sx={{fontSize: 14, color: 'primary.main'}} />
      <Typography variant="caption" sx={{fontWeight: 700, color: 'primary.main', fontSize: '0.75rem'}}>
        오늘의 대회
      </Typography>
    </Stack>
    <Stack direction="row" flexWrap="wrap" gap={0.75}>
      {CLASS_LIST.map(cls => {
        const race = todayRaces.find(r => r.category.includes(cls.key))
        const isActive = Boolean(race)
        return (
          <Box
            key={cls.key}
            onClick={race ? () => onRaceClick(race) : undefined}
            sx={{
              display: 'flex', alignItems: 'center', gap: 0.5,
              opacity: isActive ? 1 : 0.28,
              cursor: isActive ? 'pointer' : 'default',
              px: 1, py: 0.5, borderRadius: 1,
              bgcolor: isActive ? cls.color + '18' : 'transparent',
              border: '1px solid', borderColor: isActive ? cls.color + '66' : 'transparent',
              '&:hover': isActive ? {bgcolor: cls.color + '28'} : {},
              transition: 'background-color 0.1s',
            }}>
            <Box sx={{
              width: 10, height: 10, borderRadius: '50%',
              bgcolor: isActive ? cls.color : 'text.disabled',
              boxShadow: isActive ? `0 0 0 2px ${cls.color}44` : 'none',
              flexShrink: 0,
            }} />
            <Box>
              <Typography sx={{
                fontSize: '0.72rem', fontWeight: 600, lineHeight: 1.2,
                color: isActive ? cls.color : 'text.disabled',
              }}>
                {cls.key}
              </Typography>
              {isActive && race?.time && (
                <Typography sx={{fontSize: '0.65rem', color: 'text.secondary', lineHeight: 1.1}}>
                  {race.time}
                </Typography>
              )}
            </Box>
          </Box>
        )
      })}
    </Stack>
  </Box>
)

// ─── 색상 가이드 ──────────────────────────────────────────────────────────────

const ColorLegend = () => (
  <Box sx={{mt: 1.5, px: 0.5}}>
    <Typography variant="caption" sx={{fontSize: '0.68rem', color: 'text.disabled', display: 'block', mb: 0.5}}>
      클래스 색상 안내
    </Typography>
    <Stack direction="row" flexWrap="wrap" gap={1}>
      {CLASS_LIST.map(cls => (
        <Stack key={cls.key} direction="row" alignItems="center" spacing={0.5}>
          <Box sx={{width: 10, height: 10, borderRadius: '50%', bgcolor: cls.color, flexShrink: 0}} />
          <Typography variant="caption" sx={{fontSize: '0.68rem', color: 'text.secondary'}}>
            {cls.label}
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
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())
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

  const todayKey = format(new Date(), 'yyyy.MM.dd')
  const todayRaces = racesByDate.get(todayKey) ?? []

  const toggleExpand = (dateKey: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev)
      if (next.has(dateKey)) next.delete(dateKey)
      else next.add(dateKey)
      return next
    })
  }

  const prev = () => {
    setExpandedDates(new Set())
    setSelectedDate(null)
    setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }
  const next = () => {
    setExpandedDates(new Set())
    setSelectedDate(null)
    setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }
  const today = () => {
    setExpandedDates(new Set())
    setSelectedDate(null)
    setCurrent(new Date())
  }

  const selectedRaces = selectedDate ? (racesByDate.get(selectedDate) ?? []) : []
  const selectedDateObj = selectedDate ? new Date(selectedDate.replace(/\./g, '-')) : null

  return (
    <Box>
      {/* 오늘 대회가 있으면 상단에 클래스별 하이라이트 표시 */}
      {todayRaces.length > 0 && (
        <TodayRaceHeader todayRaces={todayRaces} onRaceClick={onRaceClick} />
      )}

      {/* 헤더 */}
      <Stack direction="row" alignItems="center" sx={{mb: 1.5}}>
        <IconButton size="small" onClick={prev} aria-label="이전 달"><ChevronLeftIcon /></IconButton>
        <Typography variant="subtitle1" sx={{fontWeight: 700, mx: 1, minWidth: 110, textAlign: 'center'}}>
          {format(current, 'yyyy년 M월', {locale: ko})}
        </Typography>
        <IconButton size="small" onClick={next} aria-label="다음 달"><ChevronRightIcon /></IconButton>
        <Typography variant="caption" onClick={today} sx={{ml: 1, cursor: 'pointer', color: 'primary.main', '&:hover': {textDecoration: 'underline'}}}>
          오늘
        </Typography>
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
          const todayFlag = isToday(day)
          const isPastDay = !todayFlag && isPast(startOfDay(day))
          const inMonth = isSameMonth(day, current)

          if (isMobile) {
            return (
              <DayCellMobile
                key={dateKey}
                day={day}
                dayRaces={dayRaces}
                inMonth={inMonth}
                todayFlag={todayFlag}
                isPastDay={isPastDay}
                dayNum={day.getDay()}
                isSelected={selectedDate === dateKey}
                onSelect={() => setSelectedDate(selectedDate === dateKey ? null : dateKey)}
              />
            )
          }

          return (
            <DayCellDesktop
              key={dateKey}
              day={day}
              dayRaces={dayRaces}
              inMonth={inMonth}
              todayFlag={todayFlag}
              isPastDay={isPastDay}
              dayNum={day.getDay()}
              expanded={expandedDates.has(dateKey)}
              onToggleExpand={() => toggleExpand(dateKey)}
              onRaceClick={onRaceClick}
            />
          )
        })}
      </Box>

      {/* 색상 가이드 */}
      <ColorLegend />

      {/* 모바일: 선택 날짜 하단 드로어 (Google Calendar 스타일) */}
      {isMobile && (
        <Drawer
          anchor="bottom"
          open={Boolean(selectedDate && selectedRaces.length > 0)}
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
                {selectedDateObj && format(selectedDateObj, 'EEE', {locale: ko})} · {selectedRaces.length}개 일정
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setSelectedDate(null)} aria-label="닫기" sx={{ml: 'auto'}}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>

          <Divider />

          {/* 대회 목록 — 시간대 그룹 × 경기장 열 매트릭스 */}
          <Box sx={{overflowY: 'auto'}}>
            <DrawerRaceMatrix
              races={selectedRaces}
              onRaceClick={race => {onRaceClick(race); setSelectedDate(null)}}
            />
          </Box>
        </Drawer>
      )}
    </Box>
  )
}
