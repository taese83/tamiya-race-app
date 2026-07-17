import {useMemo, useState, useCallback, useRef, useEffect} from 'react'
import {useQuery} from '@tanstack/react-query'
import {
  Box, Typography, AppBar, Toolbar, IconButton,
  CircularProgress, Alert, Stack, Chip,
  ToggleButtonGroup, ToggleButton, Paper, Collapse,
  Button, Badge, Tooltip, Fab,
} from '@mui/material'
import ViewListIcon from '@mui/icons-material/ViewList'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import FilterListIcon from '@mui/icons-material/FilterList'
import TodayIcon from '@mui/icons-material/Today'
import {format} from 'date-fns'
import {RACES_QUERY_KEY, fetchRaces} from '@/entities/race'
import type {RacesResponse, RaceEntry} from '@/entities/race'
import {RaceTable} from '@/features/race-list/ui/RaceTable'
import {RaceDetailDrawer} from '@/features/race-list/ui/RaceDetailDrawer'
import {RegistrationDrawer} from '@/features/race-list/ui/RegistrationDrawer'
import {RaceCalendar, TodayRaceHeader} from '@/features/race-calendar/ui/RaceCalendar'
import {RaceFilter} from '@/features/race-filter/ui/RaceFilter'
import {ShareButton} from '@/features/race-share/ui/ShareButton'
import {usePageSettings} from '@/features/race-filter/model/usePageSettings'
import {getRaceType, getRegion} from '@/shared/lib/raceMeta'

function matchCategory(category: string, filter: string): boolean {
  return category.includes(filter.replace(' 클래스', ''))
}

export const RaceListPage = () => {
  // ── 통합 설정 상태 (URL params + localStorage) ───────────────────────────
  const {
    viewMode, setViewMode,
    calendarView, setCalendarView,
    selectedVenues, setSelectedVenues,
    selectedCategories, setSelectedCategories,
    selectedRaceTypes, setSelectedRaceTypes,
    selectedRegions, setSelectedRegions,
    clearAllFilters,
    currentSettings,
  } = usePageSettings()

  const [showFilter, setShowFilter] = useState(false)
  const [calendarSelectedRace, setCalendarSelectedRace] = useState<RaceEntry | null>(null)
  // 캘린더: todayKey 증가 → CalendarDay/Week/Month remount → 오늘 날짜로 초기화
  const [calendarTodayKey, setCalendarTodayKey] = useState(0)
  // 접수 상세 드로어 — 리스트·캘린더 공통
  const [regDrawerRaces, setRegDrawerRaces] = useState<RaceEntry[]>([])

  const {data, isLoading, isError, error} = useQuery<RacesResponse, Error>({
    queryKey: RACES_QUERY_KEY,
    queryFn: ({signal}) => fetchRaces(signal),
    staleTime: Infinity,
    retry: 1,
  })

  // ── 필터 적용 ────────────────────────────────────────────────────────────────
  const filteredRaces = useMemo(() => {
    if (!data?.data) return []
    return data.data.filter(r => {
      const venueOk = selectedVenues.length === 0 || selectedVenues.includes(r.venue)
      const catOk = selectedCategories.length === 0 || selectedCategories.some((c: string) => matchCategory(r.category, c))
      const typeOk = selectedRaceTypes.length === 0 || selectedRaceTypes.includes(getRaceType(r.title))
      const regionOk = selectedRegions.length === 0 || selectedRegions.includes(getRegion(r.venue))
      return venueOk && catOk && typeOk && regionOk
    })
  }, [data, selectedVenues, selectedCategories, selectedRaceTypes, selectedRegions])

  // 오늘 날짜 경기 — filteredRaces 기반 (캘린더와 동일 로직, 필터 적용됨)
  const todayRaces = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy.MM.dd')
    return filteredRaces.filter(r => r.date === todayStr)
  }, [filteredRaces])

  const updatedAt = data?.cachedAt
    ? format(new Date(data.cachedAt), 'yyyy.MM.dd HH:mm')
    : null

  const handleViewChange = (_: React.MouseEvent, v: 'list' | 'calendar' | null) => {
    if (v != null) setViewMode(v)
  }

  const activeFilterCount = selectedVenues.length + selectedCategories.length + selectedRaceTypes.length + selectedRegions.length

  // ref로 최신 filteredRaces를 항상 참조 — useCallback 클로저 stale 방지
  // useEffect로 커밋된 값만 반영 (concurrent mode에서 버려진 render 값 방지)
  const filteredRacesRef = useRef(filteredRaces)
  useEffect(() => { filteredRacesRef.current = filteredRaces }, [filteredRaces])

  const viewModeRef = useRef(viewMode)
  useEffect(() => { viewModeRef.current = viewMode }, [viewMode])

  const handleGoToToday = useCallback(() => {
    if (viewModeRef.current === 'list') {
      // 클릭 시점의 최신 filteredRaces 기준으로 anchor 날짜 계산
      const dates = Array.from(new Set(filteredRacesRef.current.map(r => r.date))).sort()
      const todayStr = format(new Date(), 'yyyy.MM.dd')
      const target = dates.includes(todayStr)
        ? todayStr
        : dates.find(d => d >= todayStr) ?? null
      if (!target) return
      const el = document.getElementById(`race-date-${target}`)
      el?.scrollIntoView({behavior: 'smooth', block: 'start'})
    } else {
      setCalendarTodayKey(k => k + 1)
    }
  }, [])

  return (
    <Box sx={{minHeight: '100vh', bgcolor: 'background.default'}}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider'}}>
        <Toolbar sx={{
          minHeight: '52px !important',
          height: 52,
          gap: 0.75,
          flexWrap: 'nowrap',
          overflow: 'hidden',
        }}>
          <Box
            component="img"
            src="https://tamiya.co.kr/img/main/site_logo.png"
            alt="TAMIYA"
            sx={{height: 26, flexShrink: 0, mr: 0.5}}
          />
          <Typography
            variant="h6"
            noWrap
            sx={{fontWeight: 700, fontSize: {xs: '0.85rem', sm: '1rem'}, flex: 1, minWidth: 0}}>
            매장·경기장 대회 일정
          </Typography>

          {updatedAt != null && (
            <Tooltip title="매일 자정 자동 업데이트됩니다">
              <Chip
                label={`${updatedAt} 기준`}
                size="small"
                variant="outlined"
                sx={{
                  fontSize: '0.7rem', height: 22, cursor: 'default', flexShrink: 0,
                  display: {xs: 'none', sm: 'inline-flex'},
                }}
              />
            </Tooltip>
          )}

          <Tooltip title={showFilter ? '필터 닫기' : '필터 열기'}>
            <IconButton
              size="small"
              onClick={() => setShowFilter(v => !v)}
              aria-label={showFilter ? '필터 닫기' : '필터 열기'}
              color={activeFilterCount > 0 ? 'primary' : 'default'}>
              <Badge
                badgeContent={activeFilterCount}
                color="primary"
                sx={{'& .MuiBadge-badge': {fontSize: '0.6rem', height: 14, minWidth: 14, top: 2, right: 2}}}>
                <FilterListIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>

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

          <ShareButton settings={currentSettings} />
        </Toolbar>

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
                  selectedRaceTypes={selectedRaceTypes}
                  selectedRegions={selectedRegions}
                  onVenuesChange={setSelectedVenues}
                  onCategoriesChange={setSelectedCategories}
                  onRaceTypesChange={setSelectedRaceTypes}
                  onRegionsChange={setSelectedRegions}
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
                    onClick={clearAllFilters}
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
          <>
            {todayRaces.length > 0 && (
              <TodayRaceHeader todayRaces={todayRaces} />
            )}
            <RaceTable races={filteredRaces} />
          </>
        )}

        {data != null && viewMode === 'calendar' && (
          <RaceCalendar
            races={filteredRaces}
            view={calendarView}
            onViewChange={setCalendarView}
            onRaceClick={setCalendarSelectedRace}
            onRegStartClick={setRegDrawerRaces}
            todayKey={calendarTodayKey}
          />
        )}

        {/* RaceDetailDrawer — 리스트/캘린더 공통 (오늘의 대회 헤더에서도 호출) */}
        <RaceDetailDrawer race={calendarSelectedRace} onClose={() => setCalendarSelectedRace(null)} />
      </Box>

      {/* 접수 상세 드로어 — 리스트·캘린더 공통 */}
      <RegistrationDrawer races={regDrawerRaces} onClose={() => setRegDrawerRaces([])} />

      {/* 오늘 날짜로 이동 FAB — 데이터 로드 후 항상 표시 */}
      {data != null && (
        <Tooltip title="오늘로 이동" placement="left">
          <Fab
            size="small"
            color="primary"
            aria-label="오늘 날짜로 이동"
            onClick={handleGoToToday}
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: (theme) => theme.zIndex.drawer,
            }}>
            <TodayIcon />
          </Fab>
        </Tooltip>
      )}
    </Box>
  )
}
