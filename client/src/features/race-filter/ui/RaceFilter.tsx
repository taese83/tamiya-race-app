import {useMemo} from 'react'
import {
  Box, Typography, Autocomplete, TextField, Chip,
  Stack, ToggleButtonGroup, ToggleButton, Divider,
} from '@mui/material'
import type {RaceEntry} from '@/entities/race'
import {
  RACE_TYPE_LABEL, RACE_TYPE_COLOR, REGION_LABEL,
  type RaceType, type Region,
} from '@/shared/lib/raceMeta'

interface RaceFilterProps {
  races: RaceEntry[]
  selectedVenues: string[]
  selectedCategories: string[]
  selectedRaceTypes: RaceType[]
  selectedRegions: Region[]
  onVenuesChange: (v: string[]) => void
  onCategoriesChange: (c: string[]) => void
  onRaceTypesChange: (t: RaceType[]) => void
  onRegionsChange: (r: Region[]) => void
}

function extractVenues(races: RaceEntry[]): string[] {
  const set = new Set<string>()
  races.forEach(r => { if (r.venue) set.add(r.venue) })
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'ko'))
}

function extractCategories(races: RaceEntry[]): string[] {
  const set = new Set<string>()
  races.forEach(r => {
    const m = r.category.match(/M[0-9][AB]? 클래스|OPEN 클래스|OPEN/)?.[0]
    if (m) set.add(m)
  })
  return Array.from(set).sort()
}

export const RaceFilter = ({
  races,
  selectedVenues,
  selectedCategories,
  selectedRaceTypes,
  selectedRegions,
  onVenuesChange,
  onCategoriesChange,
  onRaceTypesChange,
  onRegionsChange,
}: RaceFilterProps) => {
  const venues = useMemo(() => extractVenues(races), [races])
  const categories = useMemo(() => extractCategories(races), [races])

  const toggleSx = {
    borderRadius: '16px !important',
    border: '1px solid !important',
    px: 1.5, py: 0.25,
    fontSize: '0.75rem',
    '&.Mui-selected': {
      bgcolor: 'primary.main',
      color: '#fff',
      borderColor: 'primary.main !important',
    },
  }

  return (
    <Stack spacing={1.5}>
      {/* 대회 유형 */}
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{display: 'block', mb: 0.75}}>대회 유형</Typography>
        <ToggleButtonGroup
          value={selectedRaceTypes}
          onChange={(_e, v) => onRaceTypesChange(v)}
          size="small"
          sx={{flexWrap: 'wrap', gap: 0.5}}>
          {(['station', 'world', 'asia'] as RaceType[]).map(type => (
            <ToggleButton
              key={type}
              value={type}
              sx={{
                ...toggleSx,
                '&.Mui-selected': {
                  bgcolor: RACE_TYPE_COLOR[type],
                  color: '#fff',
                  borderColor: `${RACE_TYPE_COLOR[type]} !important`,
                },
              }}>
              {RACE_TYPE_LABEL[type]}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <Divider sx={{my: 0}} />

      {/* 지역 */}
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{display: 'block', mb: 0.75}}>지역</Typography>
        <ToggleButtonGroup
          value={selectedRegions}
          onChange={(_e, v) => onRegionsChange(v)}
          size="small"
          sx={{flexWrap: 'wrap', gap: 0.5}}>
          {(['seoul', 'busan'] as Region[]).map(region => (
            <ToggleButton key={region} value={region} sx={toggleSx}>
              {REGION_LABEL[region]}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <Divider sx={{my: 0}} />

      {/* 종목 */}
      {categories.length > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{display: 'block', mb: 0.75}}>종목</Typography>
          <ToggleButtonGroup
            value={selectedCategories}
            onChange={(_e, v) => onCategoriesChange(v)}
            size="small"
            sx={{flexWrap: 'wrap', gap: 0.5}}>
            {categories.map(cat => (
              <ToggleButton key={cat} value={cat} sx={toggleSx}>{cat}</ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      )}

      <Divider sx={{my: 0}} />

      {/* 장소 */}
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{display: 'block', mb: 0.75}}>장소</Typography>
        <Autocomplete
          multiple
          size="small"
          options={venues}
          value={selectedVenues}
          onChange={(_e, v) => onVenuesChange(v)}
          disableCloseOnSelect
          limitTags={4}
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
        />
      </Box>

    </Stack>
  )
}
