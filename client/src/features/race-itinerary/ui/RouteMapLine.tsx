import {Box, Stack, Typography} from '@mui/material'
import type {RaceEntry} from '@/entities/race'
import type {ItineraryEntry} from './_types'
import {RouteStop} from './RouteStop'

interface RouteMapLineProps {
  venue: string
  venueColor: string     // hex — borderLeft 직접 사용
  entries: ItineraryEntry[]
  onRaceClick: (race: RaceEntry) => void
}

export const RouteMapLine = ({venue, venueColor, entries, onRaceClick}: RouteMapLineProps) => (
  <Box>
    {/* 경기장명 헤더 — 색상 사각형 인디케이터 + 텍스트 (WCAG 1.4.1: 색상만으로 정보 전달 금지) */}
    <Stack direction="row" alignItems="center" spacing={1} sx={{px: 2, py: 0.75}}>
      <Box
        aria-hidden
        sx={{
          width: 12,
          height: 12,
          borderRadius: '2px',
          bgcolor: venueColor,
          flexShrink: 0,
        }}
      />
      <Typography variant="caption" sx={{fontWeight: 700, color: 'text.primary'}}>
        {venue}
      </Typography>
    </Stack>

    {/* 정류장 목록 — borderLeft로 노선 표시 */}
    <Box
      component="ul"
      aria-label={`${venue} 정류장`}
      sx={{
        listStyle: 'none',
        m: 0,
        pl: 2,
        borderLeft: `4px solid ${venueColor}`,
        ml: 2,
      }}>
      {entries.map(entry => (
        <Box component="li" key={entry.race.id}>
          <RouteStop
            entry={entry}
            venueColor={venueColor}
            onClick={() => onRaceClick(entry.race)}
          />
        </Box>
      ))}
    </Box>
  </Box>
)
