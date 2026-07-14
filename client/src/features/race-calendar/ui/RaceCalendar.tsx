import {useState} from 'react'
import {Box, ToggleButtonGroup, ToggleButton} from '@mui/material'
import ViewDayIcon from '@mui/icons-material/ViewDay'
import ViewWeekIcon from '@mui/icons-material/ViewWeek'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import type {RaceEntry} from '@/entities/race'
import {CalendarDay} from './CalendarDay'
import {CalendarWeek} from './CalendarWeek'
import {CalendarMonth} from './CalendarMonth'

export type CalendarViewType = 'day' | 'week' | 'month'

interface RaceCalendarProps {
  races: RaceEntry[]
  onRaceClick: (race: RaceEntry) => void
}

export const RaceCalendar = ({races, onRaceClick}: RaceCalendarProps) => {
  const [view, setView] = useState<CalendarViewType>('month')

  const handleViewChange = (_: React.MouseEvent, v: CalendarViewType | null) => {
    if (v != null) setView(v)
  }

  return (
    <Box>
      {/* 뷰 전환 */}
      <Box sx={{display: 'flex', justifyContent: 'flex-end', mb: 1.5}}>
        <ToggleButtonGroup
          value={view}
          exclusive
          onChange={handleViewChange}
          size="small"
          aria-label="캘린더 뷰 선택">
          <ToggleButton value="day" aria-label="일 뷰">
            <ViewDayIcon fontSize="small" sx={{mr: 0.5}} />
            일
          </ToggleButton>
          <ToggleButton value="week" aria-label="주 뷰">
            <ViewWeekIcon fontSize="small" sx={{mr: 0.5}} />
            주
          </ToggleButton>
          <ToggleButton value="month" aria-label="월 뷰">
            <CalendarMonthIcon fontSize="small" sx={{mr: 0.5}} />
            월
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {view === 'day' && <CalendarDay races={races} onRaceClick={onRaceClick} />}
      {view === 'week' && <CalendarWeek races={races} onRaceClick={onRaceClick} />}
      {view === 'month' && <CalendarMonth races={races} onRaceClick={onRaceClick} />}
    </Box>
  )
}
