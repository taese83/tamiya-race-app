import {useState, useMemo} from 'react'
import {useQuery} from '@tanstack/react-query'
import {
  Box, Typography, AppBar, Toolbar, IconButton,
  CircularProgress, Alert, Stack, Chip,
  ToggleButtonGroup, ToggleButton, Paper, Collapse,
  Button, Badge, Tooltip,
} from '@mui/material'
import ViewListIcon from '@mui/icons-material/ViewList'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import FilterListIcon from '@mui/icons-material/FilterList'
import {format} from 'date-fns'
import {RACES_QUERY_KEY, fetchRaces} from '@/entities/race'
import type {RacesResponse, RaceEntry} from '@/entities/race'
import {RaceTable} from '@/features/race-list/ui/RaceTable'
import {RaceDetailDrawer} from '@/features/race-list/ui/RaceDetailDrawer'
import {RaceCalendar} from '@/features/race-calendar/ui/RaceCalendar'
import {RaceFilter} from '@/features/race-filter/ui/RaceFilter'

type ViewMode = 'list' | 'calendar'

function matchCategory(category: string, filter: string): boolean {
  return category.includes(filter.replace(' 클래스', ''))
}

export const RaceListPage = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [showFilter, setShowFilter] = useState(false)
  const [selectedVenues, setSelectedVenues] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [calendarSelectedRace, setCalendarSelectedRace] = useState<RaceEntry | null>(null)

  const {data, isLoading, isError, error} = useQuery<RacesResponse, Error>({
    queryKey: RACES_QUERY_KEY,
    queryFn: ({signal}) => fetchRaces(signal),
    staleTime: Infinity,
    retry: 1,
  })

  const filteredRaces = useMemo(() => {
    if (!data?.data) return []
    return data.data.filter(r => {
      const venueOk = selectedVenues.length === 0 || selectedVenues.includes(r.venue)
      const catOk = selectedCategories.length === 0 || selectedCategories.some(c => matchCategory(r.category, c))
      return venueOk && catOk
    })
  }, [data, selectedVenues, selectedCategories])

  const updatedAt = data?.cachedAt
    ? format(new Date(data.cachedAt), 'yyyy.MM.dd HH:mm')
    : null

  const handleViewChange = (_: React.MouseEvent, v: ViewMode | null) => {
    if (v != null) setViewMode(v)
  }

  const activeFilterCount = selectedVenues.length + selectedCategories.length

  return (
    <Box sx={{minHeight: '100vh', bgcolor: 'background.default'}}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider'}}>
        <Toolbar sx={{minHeight: '52px !important', gap: 1}}>
          <Box
            component="img"
            src="https://tamiya.co.kr/img/main/site_logo.png"
            alt="TAMIYA"
            sx={{height: 28, mr: 1}}
          />
          <Typography variant="h6" sx={{fontWeight: 700, fontSize: '1rem', flex: 1}}>
            매장·경기장 대회 일정
          </Typography>

          {/* 업데이트 시각 — 새로고침 버튼 대신 표시 */}
          {updatedAt != null && (
            <Tooltip title="매일 자정 자동 업데이트됩니다">
              <Chip
                label={`${updatedAt} 기준`}
                size="small"
                variant="outlined"
                sx={{fontSize: '0.7rem', height: 22, cursor: 'default'}}
              />
            </Tooltip>
          )}

          {/* 필터 토글 */}
          <Tooltip title={showFilter ? '필터 닫기' : '필터 열기'}>
            <IconButton
              size="small"
              onClick={() => setShowFilter(v => !v)}
              aria-label="필터 열기"
              color={activeFilterCount > 0 ? 'primary' : 'default'}>
              <Badge
                badgeContent={activeFilterCount}
                color="primary"
                sx={{'& .MuiBadge-badge': {fontSize: '0.6rem', height: 14, minWidth: 14, top: 2, right: 2}}}>
                <FilterListIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* 리스트 / 캘린더 전환 */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewChange}
            size="small"
            aria-label="뷰 전환">
            <ToggleButton value="list" aria-label="리스트 뷰" sx={{px: 1, py: 0.25}}>
              <ViewListIcon fontSize="small" />
            </ToggleButton>
            <ToggleButton value="calendar" aria-label="캘린더 뷰" sx={{px: 1, py: 0.25}}>
              <CalendarMonthIcon fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>
        </Toolbar>

        {/* 통합 필터 패널 */}
        <Collapse in={showFilter}>
          <Paper
            square
            elevation={0}
            sx={{px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider'}}>
            <Stack direction={{xs: 'column', md: 'row'}} spacing={2} alignItems={{md: 'flex-start'}}>
              <Box sx={{flex: 1}}>
                <RaceFilter
                  races={data?.data ?? []}
                  selectedVenues={selectedVenues}
                  selectedCategories={selectedCategories}
                  onVenuesChange={setSelectedVenues}
                  onCategoriesChange={setSelectedCategories}
                />
              </Box>
              {activeFilterCount > 0 && (
                <Stack
                  spacing={0.75}
                  sx={{minWidth: 140, pt: {xs: 0, md: 3.5}, alignItems: {xs: 'flex-start', md: 'flex-end'}}}>
                  <Chip
                    label={`${filteredRaces.length}건 표시`}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{height: 22, fontSize: '0.7rem'}}
                  />
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => {setSelectedVenues([]); setSelectedCategories([])}}
                    sx={{fontSize: '0.72rem', py: 0, color: 'text.secondary', minWidth: 0}}>
                    전체 보기
                  </Button>
                </Stack>
              )}
            </Stack>
          </Paper>
        </Collapse>
      </AppBar>

      <Box sx={{maxWidth: viewMode === 'calendar' ? 1100 : 900, mx: 'auto', px: 2, py: 3}}>
        {isLoading && (
          <Stack alignItems="center" spacing={2} sx={{py: 8}}>
            <CircularProgress />
            <Typography color="text.secondary">일정을 불러오는 중...</Typography>
          </Stack>
        )}

        {isError && (
          <Alert severity="error" sx={{mt: 2}}>
            {error instanceof Error ? error.message : '데이터를 불러오지 못했습니다.'}
          </Alert>
        )}

        {data != null && viewMode === 'list' && (
          <RaceTable races={filteredRaces} />
        )}

        {data != null && viewMode === 'calendar' && (
          <>
            <RaceCalendar races={filteredRaces} onRaceClick={setCalendarSelectedRace} />
            <RaceDetailDrawer race={calendarSelectedRace} onClose={() => setCalendarSelectedRace(null)} />
          </>
        )}
      </Box>
    </Box>
  )
}
