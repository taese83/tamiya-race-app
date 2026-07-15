import {useState, useEffect} from 'react'
import {
  Box, Typography, Stack, IconButton, Divider, Paper, Chip, Collapse,
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import {format, isToday, isPast, startOfDay, addDays, subDays} from 'date-fns'
import {ko} from 'date-fns/locale'
import type {RaceEntry} from '@/entities/race'
import {CategoryChip} from '@/entities/race'
import {ItineraryButton, RouteMapPanel, computeOptimalItinerary} from '@/features/race-itinerary'
import type {ItineraryResult, ItineraryOptions} from '@/features/race-itinerary'

interface CalendarDayProps {
  races: RaceEntry[]
  onRaceClick: (race: RaceEntry) => void
}

export const CalendarDay = ({races, onRaceClick}: CalendarDayProps) => {
  const [current, setCurrent] = useState(() => new Date())
  const [routeMapOpen, setRouteMapOpen] = useState(false)
  const [itinerary, setItinerary] = useState<ItineraryResult | null>(null)

  const dateKey = format(current, 'yyyy.MM.dd')
  const dayRaces = races
    .filter(r => r.date === dateKey)
    .sort((a, b) => a.time.localeCompare(b.time))

  // 날짜 변경 시 패널 자동 닫힘
  useEffect(() => {
    setRouteMapOpen(false)
    setItinerary(null)
  }, [current])

  const handleItineraryOpen = (options: ItineraryOptions) => {
    setItinerary(computeOptimalItinerary(dayRaces, options))
    setRouteMapOpen(true)
  }

  // warningMessage 계산
  const timedRaces = dayRaces.filter(r => r.time && r.time.trim() !== '')
  const warningMsg = itinerary && itinerary.entries.length === 1 && timedRaces.length >= 2
    ? '같은 시간대 경기만 있어 1경기만 선택 가능합니다'
    : undefined

  const prev = () => setCurrent(d => subDays(d, 1))
  const next = () => setCurrent(d => addDays(d, 1))
  const today = () => setCurrent(new Date())
  const todayFlag = isToday(current)
  const isPastDay = !todayFlag && isPast(startOfDay(current))

  // 앞뒤 5일 빠른 탐색
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
        {!todayFlag && (
          <Typography
            component="button"
            variant="caption"
            onClick={today}
            sx={{ml: 1, cursor: 'pointer', color: 'primary.main', background: 'none', border: 'none', p: 0, font: 'inherit', '&:hover': {textDecoration: 'underline'}}}>
            오늘
          </Typography>
        )}
        <Box sx={{ml: 'auto'}}>
          <ItineraryButton
            races={dayRaces}
            dateKey={dateKey}
            open={routeMapOpen}
            onOpen={handleItineraryOpen}
            onClose={() => setRouteMapOpen(false)}
          />
        </Box>
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

      {/* 최적 동선 패널 */}
      <Collapse in={routeMapOpen} unmountOnExit>
        {itinerary && (
          <Box sx={{mb: 2}}>
            <RouteMapPanel
              result={itinerary}
              dateKey={dateKey}
              onRaceClick={onRaceClick}
              onClose={() => setRouteMapOpen(false)}
              warningMessage={warningMsg}
            />
          </Box>
        )}
      </Collapse>

      {/* 대회 목록 */}
      {dayRaces.length === 0 ? (
        <Box sx={{py: 6, textAlign: 'center'}}>
          <Typography color="text.secondary">이 날 대회 일정이 없습니다</Typography>
        </Box>
      ) : (
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
                {/* 시간 */}
                <Box sx={{minWidth: 46, textAlign: 'center'}}>
                  <Typography variant="body2" sx={{fontWeight: 700, color: 'primary.main', fontSize: '0.9rem'}}>
                    {race.time || '-'}
                  </Typography>
                </Box>

                <Divider orientation="vertical" flexItem />

                {/* 내용 */}
                <Box sx={{flex: 1}}>
                  <Stack direction="row" alignItems="center" spacing={0.75} sx={{mb: 0.5}}>
                    <Typography variant="body2" sx={{fontWeight: 600}}>{race.title}</Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{display: 'block', mb: 0.5}}>
                    📍 {race.venue}
                  </Typography>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <CategoryChip category={race.category} />
                    <Stack direction="row" alignItems="center" spacing={0.25}>
                      <InfoOutlinedIcon sx={{fontSize: 12, color: 'text.disabled'}} />
                      <Typography variant="caption" sx={{fontSize: '0.65rem', color: 'text.disabled'}}>상세보기</Typography>
                    </Stack>
                  </Stack>
                </Box>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  )
}
