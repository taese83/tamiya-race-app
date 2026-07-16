import {useState} from 'react'
import {
  Box, Typography, Stack, IconButton, Paper, Tooltip,
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import {
  format, startOfWeek, endOfWeek, eachDayOfInterval,
  isToday, isPast, startOfDay, addWeeks, subWeeks,
} from 'date-fns'
import {ko} from 'date-fns/locale'
import type {RaceEntry} from '@/entities/race'
import {CategoryChip} from '@/entities/race'

interface CalendarWeekProps {
  races: RaceEntry[]
  onRaceClick: (race: RaceEntry) => void
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

  // 접수 시작일 → 경기 맵
  const regStartByDate = new Map<string, RaceEntry[]>()
  races.forEach(r => {
    if (!r.registrationStartDate) return
    const arr = regStartByDate.get(r.registrationStartDate) ?? []
    arr.push(r)
    regStartByDate.set(r.registrationStartDate, arr)
  })

  const prev = () => setCurrent(d => subWeeks(d, 1))
  const next = () => setCurrent(d => addWeeks(d, 1))

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
      </Stack>

      {/* 7열 주 뷰 — 날짜 영역만 가로 스크롤 */}
      <Box sx={{overflowX: 'auto', pb: 0.5}}>
      <Box sx={{display: 'grid', gridTemplateColumns: 'repeat(7, minmax(100px, 1fr))', gap: 0.5, minWidth: 560}}>
        {days.map(day => {
          const dateKey = format(day, 'yyyy.MM.dd')
          const dayRaces = racesByDate.get(dateKey) ?? []
          const regStartRaces = regStartByDate.get(dateKey) ?? []
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
                    <Box
                      role="button"
                      tabIndex={0}
                      aria-label={`${race.category} ${race.time} ${race.venue}`}
                      onClick={() => onRaceClick(race)}
                      onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !e.nativeEvent.isComposing) { e.preventDefault(); onRaceClick(race) } }}
                      sx={{cursor: 'pointer', '&:focus-visible': {outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 1}}}>

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
                {dayRaces.length === 0 && regStartRaces.length === 0 && (
                  <Typography variant="caption" sx={{color: 'text.disabled', fontSize: '0.65rem'}}>-</Typography>
                )}
              </Stack>

              {/* 접수 시작일 — 경기장별 도트+지점명 */}
              {regStartRaces.length > 0 && (() => {
                const venueMap = new Map(regStartRaces.map((r): [string, RaceEntry] => [r.venue, r]))
                return Array.from(venueMap.entries()).map(([venue, rep]) => (
                  <Box
                    key={`reg-${venue}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${venue} 접수 시작 상세 보기`}
                    onClick={() => onRaceClick(rep)}
                    onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !e.nativeEvent.isComposing) { e.preventDefault(); onRaceClick(rep) } }}
                    sx={{mt: 0.4, display: 'flex', alignItems: 'center', gap: 0.4, cursor: 'pointer', '&:hover .reg-label': {textDecoration: 'underline'}, '&:focus-visible': {outline: '2px solid', outlineColor: 'warning.dark', borderRadius: 0.4}}}>
                    <Box sx={{width: 6, height: 6, borderRadius: '50%', bgcolor: 'warning.main', flexShrink: 0}} />
                    <Typography className="reg-label" sx={{fontSize: '0.58rem', color: 'warning.dark', fontWeight: 600, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                      {venue.length > 5 ? venue.slice(0, 5) + '…' : venue} 접수 시작일
                    </Typography>
                  </Box>
                ))
              })()}
            </Paper>
          )
        })}
      </Box>
      </Box>
    </Box>
  )
}
