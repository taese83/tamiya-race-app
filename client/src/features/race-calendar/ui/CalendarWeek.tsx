import {useState} from 'react'
import {
  Box, Typography, Stack, IconButton, Paper, Tooltip,
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import {
  format, startOfWeek, endOfWeek, eachDayOfInterval,
  isToday, isPast, startOfDay, parseISO, addWeeks, subWeeks,
} from 'date-fns'
import {ko} from 'date-fns/locale'
import type {RaceEntry} from '@/entities/race'
import {CategoryChip} from '@/features/race-list/ui/CategoryChip'

interface CalendarWeekProps {
  races: RaceEntry[]
  onRaceClick: (race: RaceEntry) => void
}

function parseTamiyaDate(d: string): Date {
  return parseISO(d.replace(/\./g, '-'))
}

export const CalendarWeek = ({races, onRaceClick}: CalendarWeekProps) => {
  const [current, setCurrent] = useState(() => new Date())

  const weekStart = startOfWeek(current, {weekStartsOn: 0})
  const weekEnd = endOfWeek(current, {weekStartsOn: 0})
  const days = eachDayOfInterval({start: weekStart, end: weekEnd})

  const racesByDate = new Map<string, RaceEntry[]>()
  races.forEach(r => {
    const arr = racesByDate.get(r.date) ?? []
    arr.push(r)
    racesByDate.set(r.date, arr)
  })

  const prev = () => setCurrent(d => subWeeks(d, 1))
  const next = () => setCurrent(d => addWeeks(d, 1))
  const today = () => setCurrent(new Date())

  const DAY_COLOR = (dayNum: number) =>
    dayNum === 0 ? 'error.main' : dayNum === 6 ? 'primary.main' : 'text.primary'

  return (
    <Box>
      {/* 헤더 */}
      <Stack direction="row" alignItems="center" sx={{mb: 1.5}}>
        <IconButton size="small" onClick={prev} aria-label="이전 주"><ChevronLeftIcon /></IconButton>
        <Typography variant="subtitle1" sx={{fontWeight: 700, mx: 1, minWidth: 180, textAlign: 'center'}}>
          {format(weekStart, 'M월 d일', {locale: ko})} – {format(weekEnd, 'M월 d일 (EEE)', {locale: ko})}
        </Typography>
        <IconButton size="small" onClick={next} aria-label="다음 주"><ChevronRightIcon /></IconButton>
        <Typography
          variant="caption"
          onClick={today}
          sx={{ml: 1, cursor: 'pointer', color: 'primary.main', '&:hover': {textDecoration: 'underline'}}}>
          오늘
        </Typography>
      </Stack>

      {/* 7열 주 뷰 */}
      <Box sx={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5}}>
        {days.map(day => {
          const dateKey = format(day, 'yyyy.MM.dd')
          const dayRaces = racesByDate.get(dateKey) ?? []
          const todayFlag = isToday(day)
          const isPastDay = !todayFlag && isPast(startOfDay(day))
          const dayNum = day.getDay()

          return (
            <Paper
              key={dateKey}
              variant="outlined"
              sx={{
                p: 1,
                minHeight: 120,
                bgcolor: todayFlag ? 'action.selected' : 'background.paper',
                borderColor: todayFlag ? 'primary.main' : 'divider',
                opacity: isPastDay ? 0.45 : 1,
              }}>
              {/* 날짜 헤더 */}
              <Stack direction="column" alignItems="center" sx={{mb: 0.75}}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600, lineHeight: 1.2,
                    color: DAY_COLOR(dayNum),
                    fontSize: '0.65rem',
                  }}>
                  {format(day, 'EEE', {locale: ko})}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: todayFlag ? 800 : 500,
                    color: todayFlag ? 'primary.main' : DAY_COLOR(dayNum),
                    fontSize: '0.82rem',
                  }}>
                  {format(day, 'd')}
                </Typography>
              </Stack>

              {/* 대회 목록 */}
              <Stack spacing={0.5}>
                {dayRaces.map(race => (
                  <Tooltip key={race.id} title={`${race.venue} — ${race.category}`} placement="top">
                    <Box onClick={() => onRaceClick(race)} sx={{cursor: 'pointer'}}>
                      <Stack spacing={0.25}>
                        {race.time && (
                          <Typography variant="caption" sx={{fontSize: '0.65rem', color: 'text.secondary', lineHeight: 1}}>
                            {race.time}
                          </Typography>
                        )}
                        <CategoryChip category={race.category} />
                        <Typography variant="caption" sx={{fontSize: '0.62rem', color: 'text.disabled', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                          {race.venue}
                        </Typography>
                      </Stack>
                    </Box>
                  </Tooltip>
                ))}
                {dayRaces.length === 0 && (
                  <Typography variant="caption" sx={{color: 'text.disabled', fontSize: '0.65rem'}}>-</Typography>
                )}
              </Stack>
            </Paper>
          )
        })}
      </Box>
    </Box>
  )
}
