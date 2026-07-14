import {useState, useMemo} from 'react'
import {
  Box, Typography, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Chip, Stack,
  useMediaQuery, Card, CardContent,
} from '@mui/material'
import {useTheme} from '@mui/material/styles'
import {format, isPast, parseISO} from 'date-fns'
import {ko} from 'date-fns/locale'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import type {RaceEntry} from '@/entities/race'
import {CategoryChip} from './CategoryChip'
import {RaceDetailDrawer} from './RaceDetailDrawer'

interface RaceTableProps {
  races: RaceEntry[]  // 이미 필터링된 데이터
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

export const RaceTable = ({races}: RaceTableProps) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [selectedRace, setSelectedRace] = useState<RaceEntry | null>(null)

  const grouped = useMemo(() => groupByDate(races), [races])
  const sortedDates = Array.from(grouped.keys()).sort()

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
        const isPastDate = isPast(parseTamiyaDate(date))

        return (
          <Box key={date} sx={{mb: 3, opacity: isPastDate ? 0.55 : 1}}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{mb: 1}}>
              <Typography variant="subtitle2" sx={{fontWeight: 700, color: isPastDate ? 'text.secondary' : 'primary.main'}}>
                {formatKorDate(date)}
              </Typography>
              {isPastDate && <Chip label="종료" size="small" sx={{height: 18, fontSize: '0.65rem'}} />}
              <Chip label={`${dateRaces.length}건`} size="small" variant="outlined" sx={{height: 18, fontSize: '0.65rem'}} />
            </Stack>

            {isMobile ? (
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
                          <Typography variant="caption" color="text.disabled" sx={{fontSize: '0.65rem'}}>
                            상세보기
                          </Typography>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : (
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
            )}
          </Box>
        )
      })}

      <RaceDetailDrawer race={selectedRace} onClose={() => setSelectedRace(null)} />
    </Box>
  )
}
