import {useState, useMemo} from 'react'
import {
  Box, Typography, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Chip, Stack,
  useMediaQuery, Card, CardContent,
} from '@mui/material'
import {useTheme} from '@mui/material/styles'
import {format, isPast, isToday, parseISO} from 'date-fns'
import {ko} from 'date-fns/locale'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import HowToRegIcon from '@mui/icons-material/HowToReg'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import type {RaceEntry} from '@/entities/race'
import {CategoryChip} from '@/entities/race'
import type {CalendarEvent} from '@/entities/calendar-event'
import {RaceDetailDrawer} from './RaceDetailDrawer'
import {RegistrationDrawer} from './RegistrationDrawer'

interface RaceTableProps {
  races: RaceEntry[]
  calendarEvents?: CalendarEvent[]
}

function parseTamiyaDate(dateStr: string): Date {
  return parseISO(dateStr.replace(/\./g, '-'))
}

function formatKorDate(dateStr: string): string {
  try {
    return format(parseTamiyaDate(dateStr), 'M월 d일 (EEE)', {locale: ko})
  } catch {
    return dateStr
  }
}

function groupByDate(races: RaceEntry[]): Map<string, RaceEntry[]> {
  const map = new Map<string, RaceEntry[]>()
  for (const race of races) {
    const existing = map.get(race.date) ?? []
    existing.push(race)
    map.set(race.date, existing)
  }
  return map
}

export const RaceTable = ({races, calendarEvents = []}: RaceTableProps) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [selectedRace, setSelectedRace] = useState<RaceEntry | null>(null)
  // 접수 상세 드로어 — venue별 경기 목록
  const [regDrawerRaces, setRegDrawerRaces] = useState<RaceEntry[]>([])

  const grouped = useMemo(() => groupByDate(races), [races])

  // 접수 시작일 → 경기 목록 맵 (전체 races 기준)
  const regStartGrouped = useMemo(() => {
    const map = new Map<string, RaceEntry[]>()
    races.forEach(r => {
      if (!r.registrationStartDate) return
      const arr = map.get(r.registrationStartDate) ?? []
      arr.push(r)
      map.set(r.registrationStartDate, arr)
    })
    return map
  }, [races])

  // calendarEvents를 날짜별로 그룹핑
  const calendarEventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    calendarEvents.forEach(e => {
      const arr = map.get(e.date) ?? []
      arr.push(e)
      map.set(e.date, arr)
    })
    return map
  }, [calendarEvents])

  // 경기일 + 접수 시작일 + 네이버 이벤트 날짜를 합쳐 정렬
  const sortedDates = useMemo(() => {
    const dateSet = new Set([...grouped.keys(), ...regStartGrouped.keys(), ...calendarEventsByDate.keys()])
    return Array.from(dateSet).sort()
  }, [grouped, regStartGrouped, calendarEventsByDate])


  if (races.length === 0) {
    return (
      <Box sx={{py: 8, textAlign: 'center'}}>
        <Typography color="text.secondary">조건에 맞는 대회 일정이 없습니다.</Typography>
      </Box>
    )
  }

  const rowClickSx = {
    cursor: 'pointer',
    '&:hover': {bgcolor: 'action.selected'},
    transition: 'background-color 0.1s',
  }

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{mb: 1, display: 'block'}}>
        총 {races.length}건 · 행 클릭 시 상세 정보(참가비·접수방법)를 확인할 수 있습니다
      </Typography>

      {sortedDates.map(date => {
        const dateRaces = grouped.get(date) ?? []
        const isTodayDate = isToday(parseTamiyaDate(date))
        const isPastDate = isPast(parseTamiyaDate(date)) && !isTodayDate
        // 이 날짜가 접수 시작일인 경기 목록 (regStartGrouped에서 직접 조회)
        const regStartRaces = regStartGrouped.get(date) ?? []
        const dateCalendarEvents = calendarEventsByDate.get(date) ?? []
        // 경기도 없고 접수도 없고 네이버 이벤트도 없으면 렌더 불필요
        if (dateRaces.length === 0 && regStartRaces.length === 0 && dateCalendarEvents.length === 0) return null

        return (
          <Box
            key={date}
            id={`race-date-${date}`}
            sx={{mb: 3, opacity: isPastDate ? 0.55 : 1}}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{mb: 1}}>
              <Typography variant="subtitle2" sx={{fontWeight: 700, color: isPastDate ? 'text.secondary' : 'primary.main'}}>
                {formatKorDate(date)}
              </Typography>
              {isPastDate && <Chip label="종료" size="small" sx={{height: 18, fontSize: '0.65rem'}} />}
              {dateRaces.length > 0 && <Chip label={`경기 ${dateRaces.length}건`} size="small" variant="outlined" sx={{height: 18, fontSize: '0.65rem'}} />}
              {regStartRaces.length > 0 && (() => {
                const venueCount = new Set(regStartRaces.map(r => r.venue)).size
                return <Chip label={`접수 시작 ${venueCount}개소`} size="small" color="warning" sx={{height: 18, fontSize: '0.65rem'}} />
              })()}
              {dateCalendarEvents.length > 0 && (
                <Chip label={`내 캘린더 ${dateCalendarEvents.length}건`} size="small" variant="outlined"
                  sx={{height: 18, fontSize: '0.65rem', borderColor: dateCalendarEvents[0]?.color, color: dateCalendarEvents[0]?.color}} />
              )}
            </Stack>

            {/* 접수 시작 경기 배너 — 경기장별 그룹핑 */}
            {regStartRaces.length > 0 && (() => {
              // venue 기준 그룹핑, 등장 순서 유지
              const venueMap = new Map<string, typeof regStartRaces>()
              regStartRaces.forEach(r => {
                const arr = venueMap.get(r.venue) ?? []
                arr.push(r)
                venueMap.set(r.venue, arr)
              })
              return Array.from(venueMap.entries()).map(([venue, venueRaces]) => {
                // 경기일은 첫 번째 경기 기준 (같은 접수 시작일 그룹이므로 대부분 동일)
                const firstRace = venueRaces[0]!
                const categories = venueRaces.map(r => r.category.replace(' 클래스', '')).join(', ')
                const raceDateStr = format(parseTamiyaDate(firstRace.date), 'M/d', {locale: ko})
                return (
                  <Box
                    key={`reg-${venue}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${venue} 접수 상세 보기`}
                    onClick={() => setRegDrawerRaces(venueRaces)}
                    onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !e.nativeEvent.isComposing) { e.preventDefault(); setRegDrawerRaces(venueRaces) } }}
                    sx={{
                      mb: 0.75, px: 1.5, py: 1,
                      borderRadius: 1.5, cursor: 'pointer',
                      border: '1px solid', borderColor: 'warning.main',
                      bgcolor: 'warning.light',
                      display: 'flex', alignItems: 'center', gap: 1,
                      '&:hover': {bgcolor: 'warning.main', '& *': {color: '#fff !important'}},
                      transition: 'background-color 0.1s',
                    }}>
                    <HowToRegIcon sx={{fontSize: 16, color: 'warning.dark', flexShrink: 0}} />
                    <Box sx={{flex: 1, minWidth: 0}}>
                      <Typography variant="caption" sx={{fontWeight: 700, color: 'warning.dark', display: 'block', fontSize: '0.75rem'}}>
                        접수 시작 · {venue}
                      </Typography>
                      <Typography variant="caption" sx={{color: 'text.secondary', fontSize: '0.72rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block'}}>
                        {categories} · 경기일 {raceDateStr}
                      </Typography>
                    </Box>
                    <OpenInNewIcon sx={{fontSize: 14, color: 'warning.dark', flexShrink: 0}} />
                  </Box>
                )
              })
            })()}

            {dateRaces.length > 0 && isMobile ? (
              <Stack spacing={1}>
                {dateRaces.map(race => (
                  <Card
                    key={race.id}
                    variant="outlined"
                    onClick={() => setSelectedRace(race)}
                    sx={{borderRadius: 2, cursor: 'pointer', '&:active': {bgcolor: 'action.selected'}}}>
                    <CardContent sx={{p: '10px !important'}}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{mb: 0.5}}>
                        <Typography variant="body2" sx={{fontWeight: 600, flex: 1}}>{race.title}</Typography>
                        {race.time && (
                          <Typography variant="caption" sx={{fontWeight: 700, ml: 1, color: 'primary.main', whiteSpace: 'nowrap'}}>
                            {race.time}
                          </Typography>
                        )}
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{display: 'block', mb: 0.5}}>
                        📍 {race.venue}
                      </Typography>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <CategoryChip category={race.category} />
                        <Stack direction="row" alignItems="center" spacing={0.25}>
                          <InfoOutlinedIcon sx={{fontSize: 12, color: 'text.disabled'}} />
                          <Typography variant="caption" color="text.disabled" sx={{fontSize: '0.65rem'}}>상세보기</Typography>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : dateRaces.length > 0 ? (
              <TableContainer component={Paper} variant="outlined" sx={{borderRadius: 2}}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{'& th': {fontWeight: 700, bgcolor: 'action.hover', py: 0.75}}}>
                      <TableCell width={140}>대회명</TableCell>
                      <TableCell width={160}>장소</TableCell>
                      <TableCell width={70}>시간</TableCell>
                      <TableCell>종목</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dateRaces.map((race, idx) => {
                      const prevRace = dateRaces[idx - 1]
                      const showGroup = idx === 0 || prevRace?.venue !== race.venue
                      return (
                        <TableRow
                          key={race.id}
                          onClick={() => setSelectedRace(race)}
                          sx={[
                            rowClickSx,
                            showGroup && idx > 0 ? {borderTop: '1px solid', borderColor: 'divider'} : {},
                          ]}>
                          <TableCell>
                            <Typography variant="body2" sx={{fontSize: '0.8rem'}}>{race.title}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{fontSize: '0.8rem', color: 'text.secondary'}}>{race.venue}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{fontWeight: 700, fontSize: '0.82rem', color: 'primary.main'}}>
                              {race.time || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <CategoryChip category={race.category} />
                              <InfoOutlinedIcon sx={{fontSize: 14, color: 'text.disabled', ml: 'auto'}} />
                            </Stack>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : null}

            {/* ── 내 캘린더 이벤트 섹션 ── */}
            {dateCalendarEvents.length > 0 && (
              <Box sx={{mt: dateRaces.length > 0 ? 1.5 : 0}}>
                {dateRaces.length > 0 && (
                  <Stack direction="row" alignItems="center" spacing={1} sx={{mb: 0.75}}>
                    <Box sx={{flex: 1, height: 1, bgcolor: 'divider'}} />
                    <Typography variant="caption" sx={{fontSize: '0.65rem', color: 'text.disabled', whiteSpace: 'nowrap'}}>
                      내 캘린더
                    </Typography>
                    <Box sx={{flex: 1, height: 1, bgcolor: 'divider'}} />
                  </Stack>
                )}
                <Stack spacing={0.5}>
                  {dateCalendarEvents.map(event => (
                    <Box key={event.id} sx={{
                      display: 'flex', alignItems: 'flex-start', gap: 1,
                      px: 1.5, py: 0.75, borderRadius: 1,
                      bgcolor: `${event.color}0d`,
                      border: '1px solid', borderColor: `${event.color}33`,
                    }}>
                      <Box sx={{width: 8, height: 8, borderRadius: '50%', bgcolor: event.color, flexShrink: 0, mt: 0.4}} />
                      <Box sx={{flex: 1, minWidth: 0}}>
                        <Typography sx={{fontSize: '0.8rem', fontWeight: 600, lineHeight: 1.3}}>
                          {event.title}
                        </Typography>
                        <Typography sx={{fontSize: '0.7rem', color: 'text.secondary'}}>
                          {event.allDay ? '종일' : `${event.time ?? ''}${event.endTime ? ` ~ ${event.endTime}` : ''}`}
                          {event.location ? ` · 📍 ${event.location}` : ''}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}
          </Box>
        )
      })}

      <RaceDetailDrawer race={selectedRace} onClose={() => setSelectedRace(null)} />
      <RegistrationDrawer races={regDrawerRaces} onClose={() => setRegDrawerRaces([])} />
    </Box>
  )
}
