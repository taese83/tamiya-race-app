import {useMemo} from 'react'
import {Box, Paper, Typography, Stack, IconButton, Alert} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import type {RaceEntry} from '@/entities/race'
import type {ItineraryEntry, ItineraryResult} from './_types'
import {getVenueColors} from './_venueColors'
import {RouteMapLine} from './RouteMapLine'
import {TransferSegment} from './TransferSegment'

// 내부 RouteItem 타입
type RouteItem =
  | {kind: 'segment'; venue: string; venueColor: string; entries: ItineraryEntry[]}
  | {kind: 'transfer'; toVenue: string; toVenueColor: string}

interface RouteMapPanelProps {
  result: ItineraryResult
  dateKey: string
  onRaceClick: (race: RaceEntry) => void
  onClose: () => void
  warningMessage?: string
}

export const RouteMapPanel = ({
  result,
  dateKey,
  onRaceClick,
  onClose,
  warningMessage,
}: RouteMapPanelProps) => {
  const {entries, totalMoves, uniqueClasses, excludedCount} = result

  const {routeItems} = useMemo(() => {
    // venues: entries 순회, venue 첫 등장 순
    const venueOrder: string[] = []
    const seen = new Set<string>()
    for (const e of entries) {
      if (!seen.has(e.race.venue)) {
        seen.add(e.race.venue)
        venueOrder.push(e.race.venue)
      }
    }

    const colorMap = getVenueColors(venueOrder)

    // routeItems: segment/transfer 교차 배열
    const items: RouteItem[] = []
    let currentVenue: string | null = null
    let currentEntries: ItineraryEntry[] = []

    const flush = () => {
      if (currentVenue !== null && currentEntries.length > 0) {
        items.push({
          kind: 'segment',
          venue: currentVenue,
          venueColor: colorMap.get(currentVenue) ?? '#546e7a',
          entries: currentEntries,
        })
      }
    }

    for (const entry of entries) {
      const venue = entry.race.venue
      if (venue !== currentVenue) {
        flush()
        if (currentVenue !== null) {
          // Transfer segment
          items.push({
            kind: 'transfer',
            toVenue: venue,
            toVenueColor: colorMap.get(venue) ?? '#546e7a',
          })
        }
        currentVenue = venue
        currentEntries = [entry]
      } else {
        currentEntries.push(entry)
      }
    }
    flush()

    return {routeItems: items}
  }, [entries])

  return (
    <Paper
      variant="outlined"
      role="region"
      id={`route-map-${dateKey}`}
      aria-label={`${dateKey} 최적 동선`}
      sx={{borderRadius: 2, overflow: 'hidden'}}>

      {/* 요약 헤더 */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          bgcolor: 'background.paper',
          px: 2,
          py: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}>
        <Typography variant="caption" sx={{fontWeight: 600}}>
          총 {entries.length}경기 · 이동 {totalMoves}회 · 클래스 {uniqueClasses.length}종
        </Typography>
        <IconButton
          size="small"
          aria-label="동선 닫기"
          onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      {/* 알림 */}
      {excludedCount > 0 && (
        <Alert severity="info" sx={{borderRadius: 0, py: 0.5}}>
          시간 미정 {excludedCount}건 제외됨
        </Alert>
      )}
      {warningMessage && (
        <Alert severity="warning" sx={{borderRadius: 0, py: 0.5}}>
          {warningMessage}
        </Alert>
      )}

      {/* 노선표 or 빈 상태 */}
      {entries.length === 0 ? (
        <Box sx={{py: 4, textAlign: 'center'}}>
          <Typography variant="body2" color="text.secondary">
            최적 동선을 계산할 수 없습니다
          </Typography>
        </Box>
      ) : (
        <Box sx={{overflowY: 'auto', maxHeight: {xs: '60vh', md: '70vh'}}}>
          {routeItems.map((item, idx) => {
            if (item.kind === 'segment') {
              return (
                <RouteMapLine
                  key={`seg-${item.venue}-${idx}`}
                  venue={item.venue}
                  venueColor={item.venueColor}
                  entries={item.entries}
                  onRaceClick={onRaceClick}
                />
              )
            }
            return (
              <TransferSegment
                key={`transfer-${item.toVenue}-${idx}`}
                toVenue={item.toVenue}
                toVenueColor={item.toVenueColor}
              />
            )
          })}
        </Box>
      )}
    </Paper>
  )
}
