import {Box, Typography, Tooltip} from '@mui/material'
import type {CalendarEvent} from '@/entities/calendar-event'

interface CalendarEventChipProps {
  event: CalendarEvent
  compact?: boolean  // 월 뷰 셀 내 도트 모드
}

export const CalendarEventChip = ({event, compact = false}: CalendarEventChipProps) => {
  if (compact) {
    return (
      <Tooltip title={`${event.title}${event.time ? ` ${event.time}` : ''}`} placement="top">
        <Box
          sx={{
            width: 7, height: 7, borderRadius: '50%',
            bgcolor: event.color,
            display: 'inline-block',
            flexShrink: 0,
            cursor: 'default',
          }}
        />
      </Tooltip>
    )
  }

  return (
    <Box
      sx={{
        display: 'flex', alignItems: 'center', gap: 0.75,
        px: 0.75, py: 0.4, borderRadius: 1,
        bgcolor: `${event.color}18`,
        border: '1px solid', borderColor: `${event.color}44`,
        overflow: 'hidden',
      }}
    >
      <Box sx={{width: 8, height: 8, borderRadius: '50%', bgcolor: event.color, flexShrink: 0}} />
      <Box sx={{flex: 1, minWidth: 0}}>
        <Typography sx={{
          fontSize: '0.72rem', fontWeight: 600, lineHeight: 1.3,
          color: 'text.primary',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {event.title}
        </Typography>
        {(event.time || event.allDay) && (
          <Typography sx={{fontSize: '0.65rem', color: 'text.secondary', lineHeight: 1.2}}>
            {event.allDay ? '종일' : event.time}
            {event.endTime ? ` ~ ${event.endTime}` : ''}
          </Typography>
        )}
        {event.location && (
          <Typography sx={{fontSize: '0.62rem', color: 'text.disabled', lineHeight: 1.2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
            📍 {event.location}
          </Typography>
        )}
      </Box>
    </Box>
  )
}
