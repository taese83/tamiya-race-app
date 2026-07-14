import {Box, ToggleButtonGroup, ToggleButton, useMediaQuery} from '@mui/material'
import {useTheme} from '@mui/material/styles'
import ViewDayIcon from '@mui/icons-material/ViewDay'
import ViewWeekIcon from '@mui/icons-material/ViewWeek'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import type {RaceEntry} from '@/entities/race'
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
}

export const RaceCalendar = ({races, view, onViewChange, onRaceClick}: RaceCalendarProps) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const handleViewChange = (_: React.MouseEvent, v: CalendarViewType | null) => {
    if (v != null) onViewChange(v)
  }

  return (
    <Box>
      {/* 뷰 전환 — 모바일: 전체 너비 탭, 데스크탑: 우측 정렬 */}
      <Box sx={{
        display: 'flex',
        justifyContent: isMobile ? 'stretch' : 'flex-end',
        mb: 1.5,
      }}>
        <ToggleButtonGroup
          value={view}
          exclusive
          onChange={handleViewChange}
          size="small"
          aria-label="캘린더 뷰 선택"
          sx={isMobile ? {width: '100%'} : {}}>
          <ToggleButton
            value="day"
            aria-label="일 뷰"
            sx={isMobile ? {flex: 1, py: 0.4, flexDirection: 'column', gap: 0.1} : {}}>
            <ViewDayIcon sx={{fontSize: isMobile ? 14 : undefined}} />
            <Box component="span" sx={{fontSize: isMobile ? '0.58rem' : '0.8rem', lineHeight: 1}}>일</Box>
          </ToggleButton>
          <ToggleButton
            value="week"
            aria-label="주 뷰"
            sx={isMobile ? {flex: 1, py: 0.4, flexDirection: 'column', gap: 0.1} : {}}>
            <ViewWeekIcon sx={{fontSize: isMobile ? 14 : undefined}} />
            <Box component="span" sx={{fontSize: isMobile ? '0.58rem' : '0.8rem', lineHeight: 1}}>주</Box>
          </ToggleButton>
          <ToggleButton
            value="month"
            aria-label="월 뷰"
            sx={isMobile ? {flex: 1, py: 0.4, flexDirection: 'column', gap: 0.1} : {}}>
            <CalendarMonthIcon sx={{fontSize: isMobile ? 14 : undefined}} />
            <Box component="span" sx={{fontSize: isMobile ? '0.58rem' : '0.8rem', lineHeight: 1}}>월</Box>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {view === 'day' && <CalendarDay races={races} onRaceClick={onRaceClick} />}
      {view === 'week' && <CalendarWeek races={races} onRaceClick={onRaceClick} />}
      {view === 'month' && <CalendarMonth races={races} onRaceClick={onRaceClick} />}
    </Box>
  )
}
