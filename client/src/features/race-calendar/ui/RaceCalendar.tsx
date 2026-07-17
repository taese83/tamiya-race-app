import {useMemo} from 'react'
import {Box, Stack, Typography, ToggleButtonGroup, ToggleButton, useMediaQuery} from '@mui/material'
import {useTheme} from '@mui/material/styles'
import ViewDayIcon from '@mui/icons-material/ViewDay'
import ViewWeekIcon from '@mui/icons-material/ViewWeek'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import {format} from 'date-fns'
import type {RaceEntry} from '@/entities/race'
import {CLASS_LIST} from '@/entities/race'
import type {CalendarViewType} from '@/shared/lib/raceSettings'
import {CalendarDay} from './CalendarDay'
import {CalendarWeek} from './CalendarWeek'
import {CalendarMonth} from './CalendarMonth'

export type {CalendarViewType}

interface RaceCalendarProps {
  races: RaceEntry[]
  view: CalendarViewType
  onViewChange: (v: CalendarViewType) => void
  onRaceClick: (race: RaceEntry) => void
  /** 접수 배너 클릭 시 — venue별 경기 목록 전달 */
  onRegStartClick?: (races: RaceEntry[]) => void
  todayKey?: number
}

// ─── 오늘의 대회 헤더 (뷰 + 리스트 공통) ─────────────────────────────────────

export interface TodayRaceHeaderProps {
  todayRaces: RaceEntry[]
  onRaceClick: (race: RaceEntry) => void
}

export const TodayRaceHeader = ({todayRaces, onRaceClick}: TodayRaceHeaderProps) => (
  <Box sx={{mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 2, border: '1px solid', borderColor: 'divider'}}>
    <Stack direction="row" alignItems="center" spacing={0.5} sx={{mb: 1}}>
      <EmojiEventsIcon sx={{fontSize: 14, color: 'primary.main'}} />
      <Typography variant="caption" sx={{fontWeight: 700, color: 'primary.main', fontSize: '0.75rem'}}>
        오늘의 대회
      </Typography>
    </Stack>
    <Stack direction="row" flexWrap="wrap" gap={0.75}>
      {CLASS_LIST.map(cls => {
        const races = todayRaces.filter(r => r.category.includes(cls.key))
        const isActive = races.length > 0
        const isMulti = races.length > 1
        const repRace = races[0]

        return (
          <Box
            key={cls.key}
            role={isActive ? 'button' : undefined}
            tabIndex={isActive ? 0 : undefined}
            aria-label={isActive && repRace ? `${repRace.category} ${repRace.time ?? ''} ${repRace.venue}`.trim() : undefined}
            onClick={repRace ? () => onRaceClick(repRace) : undefined}
            onKeyDown={isActive && repRace ? e => { if ((e.key === 'Enter' || e.key === ' ') && !e.nativeEvent.isComposing) { e.preventDefault(); onRaceClick(repRace) } } : undefined}
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
            <Stack direction="row" alignItems="center" gap={0.4}>
              <Typography sx={{fontSize: '0.72rem', fontWeight: 600, lineHeight: 1.2, color: isActive ? cls.color : 'text.disabled'}}>
                {cls.key}
              </Typography>
              {isMulti && (
                <Box sx={{px: 0.4, py: 0.05, borderRadius: 0.5, bgcolor: cls.color, display: 'inline-flex'}}>
                  <Typography sx={{fontSize: '0.55rem', fontWeight: 700, color: '#fff', lineHeight: 1.3}}>
                    {races.length}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>
        )
      })}
    </Stack>
  </Box>
)

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export const RaceCalendar = ({races, view, onViewChange, onRaceClick, onRegStartClick, todayKey}: RaceCalendarProps) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const todayRaces = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy.MM.dd')
    return races.filter(r => r.date === todayStr)
  }, [races])

  const handleViewChange = (_: React.MouseEvent, v: CalendarViewType | null) => {
    if (v != null) onViewChange(v)
  }

  return (
    <Box>
      {/* 뷰 전환 */}
      <Box sx={{display: 'flex', justifyContent: isMobile ? 'stretch' : 'flex-end', mb: 1.5}}>
        <ToggleButtonGroup
          value={view}
          exclusive
          onChange={handleViewChange}
          size="small"
          aria-label="캘린더 뷰 선택"
          sx={isMobile ? {width: '100%'} : {}}>
          <ToggleButton value="day" aria-label="일 뷰" sx={isMobile ? {flex: 1, py: 0.4, flexDirection: 'column', gap: 0.1} : {}}>
            <ViewDayIcon sx={{fontSize: isMobile ? 14 : undefined}} />
            <Box component="span" sx={{fontSize: isMobile ? '0.58rem' : '0.8rem', lineHeight: 1}}>일</Box>
          </ToggleButton>
          <ToggleButton value="week" aria-label="주 뷰" sx={isMobile ? {flex: 1, py: 0.4, flexDirection: 'column', gap: 0.1} : {}}>
            <ViewWeekIcon sx={{fontSize: isMobile ? 14 : undefined}} />
            <Box component="span" sx={{fontSize: isMobile ? '0.58rem' : '0.8rem', lineHeight: 1}}>주</Box>
          </ToggleButton>
          <ToggleButton value="month" aria-label="월 뷰" sx={isMobile ? {flex: 1, py: 0.4, flexDirection: 'column', gap: 0.1} : {}}>
            <CalendarMonthIcon sx={{fontSize: isMobile ? 14 : undefined}} />
            <Box component="span" sx={{fontSize: isMobile ? '0.58rem' : '0.8rem', lineHeight: 1}}>월</Box>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* 오늘의 대회 — 모든 뷰 공통 */}
      {todayRaces.length > 0 && (
        <TodayRaceHeader todayRaces={todayRaces} onRaceClick={onRaceClick} />
      )}

      {view === 'day' && <CalendarDay key={todayKey} races={races} onRaceClick={onRaceClick} onRegStartClick={onRegStartClick} />}
      {view === 'week' && <CalendarWeek key={todayKey} races={races} onRaceClick={onRaceClick} onRegStartClick={onRegStartClick} />}
      {view === 'month' && <CalendarMonth key={todayKey} races={races} onRaceClick={onRaceClick} onRegStartClick={onRegStartClick} />}
    </Box>
  )
}
