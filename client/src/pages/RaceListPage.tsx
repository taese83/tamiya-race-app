import {useMemo, useState, useCallback, useRef, useEffect} from 'react'
import {useQuery} from '@tanstack/react-query'
import {
  Box, Typography, AppBar, Toolbar, IconButton,
  CircularProgress, Alert, Stack, Chip, Divider,
  ToggleButtonGroup, ToggleButton, Popover,
  Button, Badge, Tooltip, Fab,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material'
import ViewListIcon from '@mui/icons-material/ViewList'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import FilterListIcon from '@mui/icons-material/FilterList'
import TodayIcon from '@mui/icons-material/Today'
import TurnedInIcon from '@mui/icons-material/TurnedIn'
import TurnedInNotIcon from '@mui/icons-material/TurnedInNot'
import PermContactCalendarIcon from '@mui/icons-material/PermContactCalendar'
import {format} from 'date-fns'
import {RACES_ACTIVE_QUERY_KEY, RACES_ALL_QUERY_KEY, fetchActiveRaces, fetchAllRaces} from '@/entities/race'
import type {RacesResponse, RaceEntry} from '@/entities/race'
import {RaceTable} from '@/features/race-list/ui/RaceTable'
import {RaceDetailDrawer} from '@/features/race-list/ui/RaceDetailDrawer'
import {RegistrationDrawer} from '@/features/race-list/ui/RegistrationDrawer'
import {RaceCalendar, TodayRaceHeader} from '@/features/race-calendar/ui/RaceCalendar'
import {RaceFilter} from '@/features/race-filter/ui/RaceFilter'
import {ShareButton} from '@/features/race-share/ui/ShareButton'
import {usePageSettings} from '@/features/race-filter/model/usePageSettings'
import {getRaceType, getRegion} from '@/shared/lib/raceMeta'
import {useNaverCalendar, NaverCalendarDrawer} from '@/features/naver-calendar'
import {useFavorites} from '@/features/race-favorite'

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
    onlyFavorites, setOnlyFavorites,
    clearAllFilters,
    currentSettings,
  } = usePageSettings()

  const {favorites, count: favoriteCount, isReady: favoritesReady, clearAll: clearAllFavorites} = useFavorites()
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)

  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null)
  const showFilter = Boolean(filterAnchorEl)
  const [calendarSelectedRace, setCalendarSelectedRace] = useState<RaceEntry | null>(null)
  // 캘린더: todayKey 증가 → CalendarDay/Week/Month remount → 오늘 날짜로 초기화
  const [calendarTodayKey, setCalendarTodayKey] = useState(0)
  // 접수 상세 드로어 — 리스트·캘린더 공통
  const [regDrawerRaces, setRegDrawerRaces] = useState<RaceEntry[]>([])
  // 내 캘린더 드로어
  const [showCalendarDrawer, setShowCalendarDrawer] = useState(false)
  const naverCalendar = useNaverCalendar()

  // 두 스냅샷을 병렬로 로드
  //  - active: 사이트에 살아있는 게시글 (리스트 뷰 기본)
  //  - all: 병합 아카이브 (캘린더 뷰, 즐겨찾기 히스토리)
  const activeQuery = useQuery<RacesResponse, Error>({
    queryKey: RACES_ACTIVE_QUERY_KEY,
    queryFn: ({signal}) => fetchActiveRaces(signal),
    staleTime: Infinity,
    retry: 1,
  })
  const allQuery = useQuery<RacesResponse, Error>({
    queryKey: RACES_ALL_QUERY_KEY,
    queryFn: ({signal}) => fetchAllRaces(signal),
    staleTime: Infinity,
    retry: 1,
  })

  // 뷰·모드별 데이터 소스 선택
  //  - 리스트 뷰: active (아카이브가 무한히 쌓이는 것을 방지)
  //  - 캘린더 뷰: 전체 (지난달/미래월 자유 탐색)
  //  - 즐겨찾기만 보기: 항상 전체 (히스토리 조회)
  const useAllData = viewMode === 'calendar' || onlyFavorites
  const activeQueryData = useAllData ? allQuery : activeQuery
  const {data, isLoading, isError, error} = activeQueryData

  // ── 필터 적용 (즐겨찾기 게이팅 → 사용자 필터) ───────────────────────────
  // onlyFavorites=true이면 favorites Set을 base로 좁힌 뒤 그 위에 기존 4축 필터를 적용한다.
  const filteredRaces = useMemo(() => {
    if (!data?.data) return []
    return data.data.filter(r => {
      if (onlyFavorites && !favorites.has(r.id)) return false
      const venueOk = selectedVenues.length === 0 || selectedVenues.includes(r.venue)
      const catOk = selectedCategories.length === 0 || selectedCategories.some((c: string) => matchCategory(r.category, c))
      const typeOk = selectedRaceTypes.length === 0 || selectedRaceTypes.includes(getRaceType(r.title))
      const regionOk = selectedRegions.length === 0 || selectedRegions.includes(getRegion(r.venue))
      return venueOk && catOk && typeOk && regionOk
    })
  }, [data, selectedVenues, selectedCategories, selectedRaceTypes, selectedRegions, onlyFavorites, favorites])

  const showEmptyFavorites = onlyFavorites && favoritesReady && favorites.size === 0

  // 오늘 날짜 경기 — filteredRaces 기반 (캘린더와 동일 로직, 필터 적용됨)
  const todayRaces = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy.MM.dd')
    return filteredRaces.filter(r => r.date === todayStr)
  }, [filteredRaces])

  const updatedAt = data?.cachedAt
    ? format(new Date(data.cachedAt), 'yyyy.MM.dd HH:mm')
    : null

  const handleViewChange = (_: React.MouseEvent, v: 'list' | 'calendar' | null) => {
    if (v == null) return
    // 뷰 전환 전에 스크롤을 상단으로 리셋
    // 리스트에서 아래로 스크롤된 상태로 캘린더로 가면 컨텐츠 높이가 급감하며
    // 스크롤 위치가 강제 조정되고 sticky AppBar가 detach/reattach하며 깜빡이는 것을 방지
    window.scrollTo({top: 0, behavior: 'auto'})
    setViewMode(v)
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

  // 리스트 뷰로 진입할 때마다 오늘(또는 가장 가까운 미래) 날짜로 자동 스크롤
  // - 최초 mount: 데이터 로드 완료 시 실행
  // - 캘린더 → 리스트로 전환: 전환 시점에 실행
  // - 필터 변경 등으로 filteredRaces가 재계산돼도 이미 스크롤한 세션은 재실행하지 않음
  //   (사용자가 스크롤한 위치를 필터 조작이 훼손하지 않도록)
  const lastAutoScrolledViewRef = useRef<'list' | 'calendar' | null>(null)
  useEffect(() => {
    if (viewMode !== 'list') {
      // 캘린더로 나가면 락 해제 — 다음 번 list 진입 시 다시 스크롤
      if (viewMode === 'calendar') lastAutoScrolledViewRef.current = null
      return
    }
    if (lastAutoScrolledViewRef.current === 'list') return
    if (filteredRaces.length === 0) return
    const dates = Array.from(new Set(filteredRaces.map(r => r.date))).sort()
    const todayStr = format(new Date(), 'yyyy.MM.dd')
    const target = dates.includes(todayStr)
      ? todayStr
      : dates.find(d => d >= todayStr) ?? null
    if (!target) return
    const el = document.getElementById(`race-date-${target}`)
    if (!el) return
    el.scrollIntoView({behavior: 'auto', block: 'start'})
    lastAutoScrolledViewRef.current = 'list'
  }, [viewMode, filteredRaces])

  return (
    <Box sx={{minHeight: '100vh', bgcolor: 'background.default', pt: '52px'}}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider'}}>
        <Toolbar sx={{
          minHeight: '52px !important',
          height: 52,
          gap: 1,
          flexWrap: 'nowrap',
          overflow: 'hidden',
          width: '100%',
          maxWidth: {xs: '100%', sm: 1100},
          mx: 'auto',
          px: {xs: 2, sm: 2},
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

          {/* 그룹 1: 스코프 (즐겨찾기 + 필터) — 데이터 집합을 좁히는 컨트롤 */}
          <Stack direction="row" alignItems="center" sx={{gap: 0.25}}>
            <Tooltip title={onlyFavorites ? '즐겨찾기만 보기 해제' : '즐겨찾기만 보기'}>
              <IconButton
                size="small"
                onClick={() => setOnlyFavorites(!onlyFavorites)}
                aria-label={onlyFavorites ? '즐겨찾기만 보기 해제' : '즐겨찾기만 보기'}
                aria-pressed={onlyFavorites}
                color={onlyFavorites ? 'primary' : 'default'}>
                <Badge
                  badgeContent={favoriteCount}
                  color="primary"
                  sx={{'& .MuiBadge-badge': {fontSize: '0.6rem', height: 14, minWidth: 14, top: 2, right: 2}}}>
                  {onlyFavorites
                    ? <TurnedInIcon fontSize="small" />
                    : <TurnedInNotIcon fontSize="small" />}
                </Badge>
              </IconButton>
            </Tooltip>

            <Tooltip title={showFilter ? '필터 닫기' : '필터 열기'}>
              <IconButton
                size="small"
                onClick={(e) => setFilterAnchorEl(prev => prev ? null : e.currentTarget)}
                aria-label={showFilter ? '필터 닫기' : '필터 열기'}
                aria-haspopup="dialog"
                aria-expanded={showFilter}
                color={activeFilterCount > 0 ? 'primary' : 'default'}>
                <Badge
                  badgeContent={activeFilterCount}
                  color="primary"
                  sx={{'& .MuiBadge-badge': {fontSize: '0.6rem', height: 14, minWidth: 14, top: 2, right: 2}}}>
                  <FilterListIcon fontSize="small" />
                </Badge>
              </IconButton>
            </Tooltip>
          </Stack>

          <Divider orientation="vertical" flexItem sx={{my: 1.25, borderColor: 'divider'}} />

          {/* 그룹 2: 뷰 전환 — 표시 방식 */}
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

          <Divider orientation="vertical" flexItem sx={{my: 1.25, borderColor: 'divider'}} />

          {/* 그룹 3: 액션 — 외부로 나가는 조작 */}
          {/* TODO: 내 캘린더 — iCal 502 이슈 해결 후 활성화 */}
          <ShareButton settings={currentSettings} />
        </Toolbar>
      </AppBar>

      {/* 필터 Popover — AppBar 밀어내리지 않고 오버레이로 표시 */}
      <Popover
        open={showFilter}
        anchorEl={filterAnchorEl}
        onClose={() => setFilterAnchorEl(null)}
        anchorOrigin={{vertical: 'bottom', horizontal: 'right'}}
        transformOrigin={{vertical: 'top', horizontal: 'right'}}
        slotProps={{paper: {sx: {mt: 0.5, width: {xs: 'calc(100vw - 16px)', sm: 480}, maxWidth: 520, maxHeight: 'calc(100vh - 80px)', overflow: 'auto'}}}}>
        <Box sx={{p: 2}}>
          {/* 즐겨찾기 섹션 — 필터 상위 개념, 개수와 전체 해제 접근 지점 */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{mb: 1.5, pb: 1.5, borderBottom: '1px solid', borderColor: 'divider'}}>
            <Stack direction="row" alignItems="center" spacing={0.75}>
              <TurnedInIcon sx={{fontSize: 16, color: favoriteCount > 0 ? 'primary.main' : 'text.disabled'}} />
              <Typography variant="caption" sx={{fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary', letterSpacing: 0.3}}>
                즐겨찾기 {favoriteCount}건
              </Typography>
            </Stack>
            <Button
              size="small"
              variant="text"
              color="error"
              disabled={favoriteCount === 0}
              onClick={() => setConfirmClearOpen(true)}
              sx={{fontSize: '0.72rem', py: 0, minWidth: 0}}>
              전체 해제
            </Button>
          </Stack>

          {/* 필터 본체 */}
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

          {/* 필터 요약 + 필터 해제 — 활성 필터가 있을 때만 */}
          {activeFilterCount > 0 && (
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider'}}>
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
                필터 전체 해제
              </Button>
            </Stack>
          )}
        </Box>
      </Popover>

      <Box sx={{
        maxWidth: 1100,
        mx: 'auto',
        px: 2,
        py: 3,
        // 뷰 전환 시 body height 급변으로 스크롤 위치가 튀며 깜빡이는 것을 방지
        minHeight: 'calc(100vh - 52px)',
      }}>
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

        {data != null && showEmptyFavorites && (
          <Stack alignItems="center" spacing={1.5} sx={{py: 8, color: 'text.secondary'}}>
            <TurnedInNotIcon sx={{fontSize: 48, opacity: 0.4}} />
            <Typography variant="body1" sx={{fontWeight: 600}}>즐겨찾기한 경기가 없습니다</Typography>
            <Typography variant="body2" sx={{textAlign: 'center', maxWidth: 300, fontSize: '0.85rem'}}>
              경기 상세 화면 왼쪽 상단의 깃발 아이콘을 눌러 즐겨찾기에 추가하세요.
            </Typography>
            <Button size="small" variant="text" onClick={() => setOnlyFavorites(false)}>
              전체 경기 보기
            </Button>
          </Stack>
        )}

        {data != null && !showEmptyFavorites && viewMode === 'list' && (
          <>
            {todayRaces.length > 0 && (
              <TodayRaceHeader todayRaces={todayRaces} />
            )}
            <RaceTable races={filteredRaces} calendarEvents={naverCalendar.events} />
          </>
        )}

        {data != null && !showEmptyFavorites && viewMode === 'calendar' && (
          <RaceCalendar
            races={filteredRaces}
            view={calendarView}
            onViewChange={setCalendarView}
            onRaceClick={setCalendarSelectedRace}
            onRegStartClick={setRegDrawerRaces}
            todayKey={calendarTodayKey}
            calendarEvents={naverCalendar.events}
          />
        )}

        {/* RaceDetailDrawer — 리스트/캘린더 공통 (오늘의 대회 헤더에서도 호출) */}
        <RaceDetailDrawer race={calendarSelectedRace} onClose={() => setCalendarSelectedRace(null)} />
      </Box>

      {/* 접수 상세 드로어 — 리스트·캘린더 공통 */}
      <RegistrationDrawer races={regDrawerRaces} onClose={() => setRegDrawerRaces([])} />

      {/* 내 캘린더 드로어 */}
      <NaverCalendarDrawer
        open={showCalendarDrawer}
        onClose={() => setShowCalendarDrawer(false)}
        sources={naverCalendar.sources}
        loadingId={naverCalendar.loadingId}
        maxSources={naverCalendar.maxSources}
        onAdd={naverCalendar.addSource}
        onRemove={naverCalendar.removeSource}
      />

      {/* 즐겨찾기 전체 해제 confirm — destructive이므로 명시적 사용자 확인 */}
      <Dialog
        open={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        aria-labelledby="clear-favorites-title">
        <DialogTitle id="clear-favorites-title">즐겨찾기 전체 해제</DialogTitle>
        <DialogContent>
          <DialogContentText>
            즐겨찾기한 경기 {favoriteCount}건을 모두 해제합니다. 이 작업은 되돌릴 수 없습니다.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClearOpen(false)}>취소</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => { clearAllFavorites(); setConfirmClearOpen(false) }}>
            전체 해제
          </Button>
        </DialogActions>
      </Dialog>

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
