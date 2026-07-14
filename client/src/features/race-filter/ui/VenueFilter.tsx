import {
  Box, Typography, Autocomplete, TextField, Chip,
  Stack, Button,
} from '@mui/material'
import ClearIcon from '@mui/icons-material/Clear'
import type {RaceEntry} from '@/entities/race'

interface VenueFilterProps {
  races: RaceEntry[]
  selectedVenues: string[]
  onVenuesChange: (venues: string[]) => void
}

/** 전체 장소 목록을 중복 제거해 정렬 */
function extractVenues(races: RaceEntry[]): string[] {
  const set = new Set<string>()
  races.forEach(r => { if (r.venue) set.add(r.venue) })
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'ko'))
}

export const VenueFilter = ({races, selectedVenues, onVenuesChange}: VenueFilterProps) => {
  const venues = extractVenues(races)

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{mb: 0.75}}>
        <Typography variant="caption" color="text.secondary">
          장소 필터
        </Typography>
        {selectedVenues.length > 0 && (
          <Button
            size="small"
            variant="text"
            startIcon={<ClearIcon sx={{fontSize: 12}} />}
            onClick={() => onVenuesChange([])}
            sx={{fontSize: '0.7rem', py: 0, px: 0.5, minWidth: 0, color: 'text.disabled'}}>
            초기화
          </Button>
        )}
      </Stack>

      <Autocomplete
        multiple
        size="small"
        options={venues}
        value={selectedVenues}
        onChange={(_e, v) => onVenuesChange(v)}
        disableCloseOnSelect
        limitTags={3}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => {
            const {key, ...tagProps} = getTagProps({index})
            return (
              <Chip
                key={key}
                label={option}
                size="small"
                {...tagProps}
                sx={{height: 20, fontSize: '0.72rem', '& .MuiChip-label': {px: 0.75}}}
              />
            )
          })
        }
        renderInput={params => (
          <TextField
            {...params}
            placeholder={selectedVenues.length === 0 ? '장소 선택 (전체)' : undefined}
            inputProps={{...params.inputProps, 'aria-label': '장소 필터'}}
          />
        )}
        sx={{'& .MuiOutlinedInput-root': {flexWrap: 'wrap'}}}
      />
    </Box>
  )
}
