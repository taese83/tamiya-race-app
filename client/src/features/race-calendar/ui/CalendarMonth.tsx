import {useState} from 'react'
import {
  Box, Typography, Paper, Stack, IconButton, Collapse, Chip, Tooltip,
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import HowToRegIcon from '@mui/icons-material/HowToReg'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, isPast, startOfDay, parseISO,
} from 'date-fns'
import {ko} from 'date-fns/locale'
import type {RaceEntry} from '@/entities/race'
import {CategoryChip} from '@/features/race-list/ui/CategoryChip'

interface CalendarMonthProps {
  races: RaceEntry[]
  onRaceClick: (race: RaceEntry) => void
}

const MAX_SHOW = 3
const DAY_HEADERS = ['일', '월', '화', '수', '목', '금', '토']

// ─── 개별 대회 행 ──────────────────────────────────────────────────────────────

interface RaceRowProps {
  race: RaceEntry
  onClick: () => void
}

const RaceRow = ({race, onClick}: RaceRowProps) => {
  // 접수방법 아이콘: 온라인 접수가 있는 대회는 registrationMethod를 서버에서 가져오기 전이므로
  // URL 패턴에서 힌트를 얻거나, wr_id 기반 Detail을 즉시 로드하는 대신
  // 셀 목록 단계에서는 detailUrl이 있으면 접수 가능 아이콘을 항상 표시
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
          cursor: 'pointer',
          mb: 0.3,
          px: 0.5,
          py: 0.2,
          borderRadius: 0.75,
          bgcolor: 'action.hover',
          '&:hover': {bgcolor: 'action.selected'},
          transition: 'background-color 0.1s',
        }}>
        {/* 종목 칩 + 접수 아이콘 */}
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{mb: 0.2}}>
          <CategoryChip category={race.category} />
          {hasDetail && (
            <HowToRegIcon sx={{fontSize: 11, color: 'text.disabled', flexShrink: 0}} />
          )}
        </Stack>

        {/* 시간 + 장소 */}
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
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.62rem', color: 'text.disabled', lineHeight: 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
              {race.venue}
            </Typography>
          </Stack>
        </Stack>
      </Box>
    </Tooltip>
  )
}

// ─── 날짜 셀 ──────────────────────────────────────────────────────────────────

interface DayCellProps {
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

const CELL_HEIGHT = 140  // px — 모든 셀 동일 높이

const DayCell = ({
  day, dayRaces, inMonth, todayFlag, isPastDay, dayNum,
  expanded, onToggleExpand, onRaceClick,
}: DayCellProps) => {
  const overCount = dayRaces.length - MAX_SHOW
  const hasMore = overCount > 0
  const visibleRaces = expanded ? dayRaces : dayRaces.slice(0, MAX_SHOW)

  return (
    <Paper
      square
      elevation={0}
      sx={{
        // 펼친 상태이면 자동 높이, 아니면 고정 높이
        height: expanded ? 'auto' : CELL_HEIGHT,
        minHeight: expanded ? CELL_HEIGHT : undefined,
        p: 0.5,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: todayFlag ? 'action.selected' : inMonth ? 'background.paper' : 'action.disabledBackground',
        borderRight: '1px solid', borderBottom: '1px solid', borderColor: 'divider',
        // 당월 외: 0.35 / 지난 날짜: 0.45 / 오늘 이후: 1
        opacity: !inMonth ? 0.35 : isPastDay ? 0.45 : 1,
        overflow: 'hidden',
        position: 'relative',
      }}>

      {/* 날짜 숫자 */}
      <Typography
        variant="caption"
        sx={{
          display: 'block', textAlign: 'right', fontWeight: todayFlag ? 800 : 500,
          fontSize: '0.78rem', lineHeight: 1.4,
          color: todayFlag
            ? 'primary.main'
            : dayNum === 0 ? 'error.main'
            : dayNum === 6 ? 'primary.light'
            : 'text.primary',
          mb: 0.25, flexShrink: 0,
        }}>
        {format(day, 'd')}
      </Typography>

      {/* 대회 목록 */}
      <Box sx={{flex: 1, overflow: 'hidden'}}>
        {visibleRaces.map(race => (
          <RaceRow key={race.id} race={race} onClick={() => onRaceClick(race)} />
        ))}
      </Box>

      {/* +x건 더보기 / 접기 */}
      {hasMore && (
        <Box
          onClick={e => {e.stopPropagation(); onToggleExpand()}}
          sx={{
            display: 'flex', alignItems: 'center', gap: 0.25,
            cursor: 'pointer', mt: 0.25, flexShrink: 0,
            '&:hover .more-text': {textDecoration: 'underline'},
          }}>
          {expanded
            ? <ExpandLessIcon sx={{fontSize: 12, color: 'primary.main'}} />
            : <ExpandMoreIcon sx={{fontSize: 12, color: 'primary.main'}} />}
          <Typography
            className="more-text"
            variant="caption"
            sx={{fontSize: '0.65rem', color: 'primary.main', lineHeight: 1}}>
            {expanded ? '접기' : `+${overCount}건 더보기`}
          </Typography>
        </Box>
      )}
    </Paper>
  )
}

// ─── 월 캘린더 ────────────────────────────────────────────────────────────────

export const CalendarMonth = ({races, onRaceClick}: CalendarMonthProps) => {
  const [current, setCurrent] = useState(() => new Date())
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())

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

  const toggleExpand = (dateKey: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev)
      if (next.has(dateKey)) next.delete(dateKey)
      else next.add(dateKey)
      return next
    })
  }

  // 월 변경 시 펼침 상태 초기화
  const prev = () => {
    setExpandedDates(new Set())
    setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }
  const next = () => {
    setExpandedDates(new Set())
    setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }
  const today = () => {
    setExpandedDates(new Set())
    setCurrent(new Date())
  }

  return (
    <Box>
      {/* 헤더 */}
      <Stack direction="row" alignItems="center" sx={{mb: 1.5}}>
        <IconButton size="small" onClick={prev} aria-label="이전 달"><ChevronLeftIcon /></IconButton>
        <Typography variant="subtitle1" sx={{fontWeight: 700, mx: 1, minWidth: 110, textAlign: 'center'}}>
          {format(current, 'yyyy년 M월', {locale: ko})}
        </Typography>
        <IconButton size="small" onClick={next} aria-label="다음 달"><ChevronRightIcon /></IconButton>
        <Typography
          variant="caption"
          onClick={today}
          sx={{ml: 1, cursor: 'pointer', color: 'primary.main', '&:hover': {textDecoration: 'underline'}}}>
          오늘
        </Typography>

        {/* 범례 */}
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ml: 'auto'}}>
          <HowToRegIcon sx={{fontSize: 12, color: 'text.disabled'}} />
          <Typography variant="caption" sx={{fontSize: '0.68rem', color: 'text.disabled'}}>
            접수 정보 있음
          </Typography>
        </Stack>
      </Stack>

      {/* 요일 헤더 */}
      <Box sx={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 0.5}}>
        {DAY_HEADERS.map((d, i) => (
          <Typography
            key={d}
            variant="caption"
            sx={{
              display: 'block', textAlign: 'center', fontWeight: 600,
              color: i === 0 ? 'error.main' : i === 6 ? 'primary.main' : 'text.secondary',
              pb: 0.5,
            }}>
            {d}
          </Typography>
        ))}
      </Box>

      {/* 날짜 그리드 */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          // 셀이 펼쳐져도 같은 행의 다른 셀 높이가 강제로 늘어나지 않도록
          // align-items: start 로 각 셀이 독립적으로 늘어남
          alignItems: 'start',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
        }}>
        {days.map(day => {
          const dateKey = format(day, 'yyyy.MM.dd')
          const dayRaces = racesByDate.get(dateKey) ?? []
          return (
            <DayCell
              key={dateKey}
              day={day}
              dayRaces={dayRaces}
              inMonth={isSameMonth(day, current)}
              todayFlag={isToday(day)}
              isPastDay={!isToday(day) && isPast(startOfDay(day))}
              dayNum={day.getDay()}
              expanded={expandedDates.has(dateKey)}
              onToggleExpand={() => toggleExpand(dateKey)}
              onRaceClick={onRaceClick}
            />
          )
        })}
      </Box>
    </Box>
  )
}
