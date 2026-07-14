import {useMemo} from 'react'
import {
  Box, Typography, Autocomplete, TextField, Chip,
  Stack, ToggleButtonGroup, ToggleButton, Button, Divider,
} from '@mui/material'
import ClearIcon from '@mui/icons-material/Clear'
import type {RaceEntry} from '@/entities/race'

interface RaceFilterProps {
  races: RaceEntry[]                  // 원본 전체 데이터 (옵션 추출용)
  selectedVenues: string[]
  selectedCategories: string[]
  onVenuesChange: (v: string[]) => void
  onCategoriesChange: (c: string[]) => void
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
  onVenuesChange,
  onCategoriesChange,
}: RaceFilterProps) => {
  const venues = useMemo(() => extractVenues(races), [races])
  const categories = useMemo(() => extractCategories(races), [races])

  const hasFilter = selectedVenues.length > 0 || selectedCategories.length > 0

  const handleCategoryToggle = (_: React.MouseEvent, values: string[]) => {
    onCategoriesChange(values)
  }

  const clearAll = () => {
    onVenuesChange([])
    onCategoriesChange([])
  }

  return (
    <Stack spacing={1.5}>
      {/* 종목 필터 */}
      {categories.length > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{display: 'block', mb: 0.75}}>
            종목
          </Typography>
          <ToggleButtonGroup
            value={selectedCategories}
            onChange={handleCategoryToggle}
            size="small"
            sx={{flexWrap: 'wrap', gap: 0.5}}>
            {categories.map(cat => (
              <ToggleButton
                key={cat}
                value={cat}
                sx={{
                  borderRadius: '16px !important',
                  border: '1px solid !important',
                  px: 1.5, py: 0.25,
                  fontSize: '0.75rem',
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: '#fff',
                    borderColor: 'primary.main !important',
                  },
                }}>
                {cat}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      )}

      <Divider sx={{my: 0}} />

      {/* 장소 필터 */}
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{display: 'block', mb: 0.75}}>
          장소
        </Typography>
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

      {/* 전체 초기화 */}
      {hasFilter && (
        <Box sx={{display: 'flex', justifyContent: 'flex-end'}}>
          <Button
            size="small"
            variant="text"
            startIcon={<ClearIcon sx={{fontSize: 13}} />}
            onClick={clearAll}
            sx={{fontSize: '0.72rem', py: 0.25, color: 'text.secondary'}}>
            필터 전체 초기화
          </Button>
        </Box>
      )}
    </Stack>
  )
}
