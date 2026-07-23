import {useState} from 'react'
import {
  Box, Typography, Stack, IconButton, Divider, Paper, Chip,
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import {format, isToday, isPast, startOfDay, addDays, subDays} from 'date-fns'
import {ko} from 'date-fns/locale'
import HowToRegIcon from '@mui/icons-material/HowToReg'
import type {RaceEntry} from '@/entities/race'
import {CategoryChip} from '@/entities/race'
import type {CalendarEvent} from '@/entities/calendar-event'
import {CalendarEventChip} from '@/features/naver-calendar'
import {FavoriteIndicator, useFavorites} from '@/features/race-favorite'

interface CalendarDayProps {
  races: RaceEntry[]
  onRaceClick: (race: RaceEntry) => void
  onRegStartClick?: (races: RaceEntry[]) => void
  calendarEvents?: CalendarEvent[]
}

export const CalendarDay = ({races, onRaceClick, onRegStartClick, calendarEvents = []}: CalendarDayProps) => {
  const [current, setCurrent] = useState(() => new Date())
  const {isFavorite} = useFavorites()

  const dateKey = format(current, 'yyyy.MM.dd')
  const dayEvents = calendarEvents.filter(e => e.date === dateKey)
    .sort((a, b) => {
      if (a.allDay && !b.allDay) return 1
      if (!a.allDay && b.allDay) return -1
      if (!a.time && !b.time) return 0
      if (!a.time) return 1
      if (!b.time) return -1
      return a.time.localeCompare(b.time)
    })
  const dayRaces = races
    .filter(r => r.date === dateKey)
    .sort((a, b) => {
      if (!a.time && !b.time) return 0
      if (!a.time) return 1
      if (!b.time) return -1
      return a.time.localeCompare(b.time)
    })

  // 이 날짜가 접수 시작일인 경기 — 경기장별 그룹핑 (전체 경기 목록)
  const regStartVenueGroups = new Map<string, RaceEntry[]>()
  races.filter(r => r.registrationStartDate === dateKey).forEach(r => {
    const arr = regStartVenueGroups.get(r.venue) ?? []
    arr.push(r)
    regStartVenueGroups.set(r.venue, arr)
  })
  // 경기장별 첫 번째 경기를 대표값으로 사용 (first-writer-wins)
  const regStartVenues = new Map<string, RaceEntry>()
  races.filter(r => r.registrationStartDate === dateKey).forEach(r => {
    if (!regStartVenues.has(r.venue)) regStartVenues.set(r.venue, r)
  })

  const prev = () => setCurrent(d => subDays(d, 1))
  const next = () => setCurrent(d => addDays(d, 1))
  const todayFlag = isToday(current)
  const isPastDay = !todayFlag && isPast(startOfDay(current))

  const nearbyDays = Array.from({length: 11}, (_, i) => {
    const d = addDays(current, i - 5)
    return {date: d, key: format(d, 'yyyy.MM.dd'), hasRace: false}
  })
  nearbyDays.forEach(item => {
    item.hasRace = races.some(r => r.date === item.key)
  })

  return (
    <Box>
      {/* 날짜 네비게이션 */}
      <Stack direction="row" alignItems="center" sx={{mb: 1.5}}>
        <IconButton size="small" onClick={prev} aria-label="전날"><ChevronLeftIcon /></IconButton>
        <Typography
          variant="subtitle1"
          sx={{fontWeight: 700, mx: 1, minWidth: 160, textAlign: 'center', color: todayFlag ? 'primary.main' : isPastDay ? 'text.secondary' : 'text.primary'}}>
          {format(current, 'yyyy년 M월 d일 (EEE)', {locale: ko})}
          {todayFlag && (
            <Chip label="오늘" size="small" color="primary" sx={{ml: 0.75, height: 18, fontSize: '0.65rem'}} />
          )}
        </Typography>
        <IconButton size="small" onClick={next} aria-label="다음날"><ChevronRightIcon /></IconButton>
      </Stack>

      {/* 빠른 날짜 이동 바 */}
      <Stack direction="row" spacing={0.5} sx={{mb: 2, overflowX: 'auto', pb: 0.5}}>
        {nearbyDays.map(item => {
          const isActive = item.key === dateKey
          const isT = isToday(item.date)
          const dayNum = item.date.getDay()
          return (
            <Box
              key={item.key}
              role="button"
              tabIndex={0}
              aria-label={format(item.date, 'M월 d일 EEE', {locale: ko})}
              aria-pressed={isActive}
              onClick={() => setCurrent(item.date)}
              onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !e.nativeEvent.isComposing) { e.preventDefault(); setCurrent(item.date) } }}
              sx={{
                minWidth: 40, px: 0.75, py: 0.5, borderRadius: 1, cursor: 'pointer', textAlign: 'center',
                bgcolor: isActive ? 'primary.main' : isT ? 'action.selected' : 'transparent',
                '&:hover': {bgcolor: isActive ? 'primary.dark' : 'action.hover'},
                position: 'relative',
              }}>
              <Typography variant="caption" sx={{
                display: 'block', fontSize: '0.65rem', lineHeight: 1.2,
                color: isActive ? '#fff' : (dayNum === 0 ? 'error.main' : dayNum === 6 ? 'primary.main' : 'text.secondary'),
              }}>
                {format(item.date, 'EEE', {locale: ko})}
              </Typography>
              <Typography variant="caption" sx={{
                display: 'block', fontSize: '0.82rem', fontWeight: 600,
                color: isActive ? '#fff' : 'text.primary',
              }}>
                {format(item.date, 'd')}
              </Typography>
              {item.hasRace && !isActive && (
                <Box sx={{width: 4, height: 4, borderRadius: '50%', bgcolor: 'primary.main', mx: 'auto', mt: 0.25}} />
              )}
            </Box>
          )
        })}
      </Stack>

      {/* 접수 시작일 섹션 */}
      {regStartVenues.size > 0 && (
        <Box sx={{mb: 2}}>
          {Array.from(regStartVenues.entries()).map(([venue, rep]) => {
            const venueRaces = regStartVenueGroups.get(venue) ?? [rep]
            const handleRegClick = () => { if (onRegStartClick) onRegStartClick(venueRaces); else onRaceClick(rep) }
            const categories = venueRaces.map(r => r.category.replace(' 클래스', '')).join(', ')
            const raceDateStr = format(new Date(rep.date.replace(/\./g, '-')), 'M/d', {locale: ko})
            return (
            <Box
              key={`reg-${venue}`}
              role="button"
              tabIndex={0}
              aria-label={`${venue} 접수 시작 상세 보기`}
              onClick={handleRegClick}
              onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !e.nativeEvent.isComposing) { e.preventDefault(); handleRegClick() } }}
              sx={{
                mb: 0.75, px: 1.5, py: 1, borderRadius: 1.5, cursor: 'pointer',
                border: '1px solid', borderColor: 'warning.main', bgcolor: 'warning.light',
                display: 'flex', alignItems: 'center', gap: 1,
                '&:hover': {bgcolor: 'warning.main'},
                '&:focus-visible': {outline: '2px solid', outlineColor: 'warning.dark'},
                transition: 'background-color 0.1s',
              }}>
              <HowToRegIcon sx={{fontSize: 16, color: 'warning.dark', flexShrink: 0}} />
              <Box sx={{flex: 1, minWidth: 0}}>
                <Typography variant="caption" sx={{fontWeight: 700, color: 'warning.dark', display: 'block', fontSize: '0.75rem'}}>
                  접수 시작 · {venue}
                </Typography>
                <Typography variant="caption" sx={{color: 'text.secondary', fontSize: '0.72rem', display: 'block'}}>
                  {categories} · 경기일 {raceDateStr}
                </Typography>
              </Box>
            </Box>
          )})}
        </Box>
      )}

      {/* 대회 목록 */}
      {dayRaces.length === 0 && regStartVenues.size === 0 && dayEvents.length === 0 ? (
        <Box sx={{py: 6, textAlign: 'center'}}>
          <Typography color="text.secondary">이 날 대회 일정이 없습니다</Typography>
        </Box>
      ) : dayRaces.length === 0 ? null : (
        <Stack spacing={1.5} sx={{opacity: isPastDay ? 0.45 : 1}}>
          {dayRaces.map(race => (
            <Paper
              key={race.id}
              variant="outlined"
              role="button"
              tabIndex={0}
              aria-label={`${race.category} ${race.time} ${race.venue}`}
              onClick={() => onRaceClick(race)}
              onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !e.nativeEvent.isComposing) { e.preventDefault(); onRaceClick(race) } }}
              sx={{p: 1.5, cursor: 'pointer', '&:hover': {borderColor: 'primary.main', bgcolor: 'action.hover'}, '&:focus-visible': {outline: '2px solid', outlineColor: 'primary.main'}, transition: 'border-color 0.15s'}}>
              <Stack direction="row" alignItems="flex-start" spacing={1.5}>
                <Box sx={{minWidth: 46, textAlign: 'center'}}>
                  <Typography variant="body2" sx={{fontWeight: 700, color: 'primary.main', fontSize: '0.9rem'}}>
                    {race.time || '-'}
                  </Typography>
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box sx={{flex: 1}}>
                  <Stack direction="row" alignItems="center" spacing={0.75} sx={{mb: 0.5}}>
                    <FavoriteIndicator isFavorite={isFavorite(race.id)} size={14} />
                    <Typography variant="body2" sx={{fontWeight: 600}}>{race.title}</Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{display: 'block', mb: 0.5}}>
                    📍 {race.venue}
                  </Typography>
                  <CategoryChip category={race.category} />
                </Box>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      {/* 내 캘린더 이벤트 */}
      {dayEvents.length > 0 && (
        <Box sx={{mt: dayRaces.length > 0 || regStartVenues.size > 0 ? 2 : 0}}>
          {(dayRaces.length > 0 || regStartVenues.size > 0) && (
            <Divider sx={{mb: 1.5}}>
              <Typography variant="caption" sx={{fontSize: '0.65rem', color: 'text.disabled', px: 1}}>
                내 캘린더
              </Typography>
            </Divider>
          )}
          <Stack spacing={1}>
            {dayEvents.map(event => (
              <CalendarEventChip key={event.id} event={event} />
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  )
}
