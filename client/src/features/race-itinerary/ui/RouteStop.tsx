import {Box, Typography, Stack} from '@mui/material'
import {CategoryChip} from '@/entities/race'
import type {ItineraryEntry} from './_types'

interface RouteStopProps {
  entry: ItineraryEntry
  venueColor: string
  onClick: () => void
}

export const RouteStop = ({entry, venueColor, onClick}: RouteStopProps) => {
  const {race} = entry

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.key === 'Enter' || e.key === ' ') && !e.nativeEvent.isComposing) {
      e.preventDefault()
      onClick()
    }
  }

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label={`${race.time} ${race.venue} ${race.category} 경기, 상세 보기`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 0.75,
        px: 1,
        borderRadius: 1,
        cursor: 'pointer',
        position: 'relative',
        '&:hover': {bgcolor: 'action.hover'},
        '&:focus-visible': {outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2},
        '&:active': {bgcolor: 'action.selected'},
      }}>
      {/* 원형 마커 — borderLeft 선과 맞닿는 위치 */}
      <Box
        aria-hidden
        sx={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          bgcolor: venueColor,
          flexShrink: 0,
          ml: -1.75,
          border: '2px solid',
          borderColor: 'background.paper',
        }}
      />
      <Stack direction="row" alignItems="center" spacing={1} sx={{flex: 1, minWidth: 0}}>
        <Typography
          variant="body2"
          sx={{fontWeight: 700, color: 'primary.main', minWidth: 44, flexShrink: 0}}>
          {race.time || '-'}
        </Typography>
        <CategoryChip category={race.category} />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
          {race.venue}
        </Typography>
      </Stack>
    </Box>
  )
}
