import {useState} from 'react'
import {
  Drawer, Box, Typography, IconButton, Divider,
  Stack, TextField, Button, CircularProgress, Chip,
  Collapse,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import type {CalendarSource} from '@/entities/calendar-event'
import {CALENDAR_COLORS} from '@/entities/calendar-event'
import type {useNaverCalendar} from '../model/useNaverCalendar'

interface NaverCalendarDrawerProps {
  open: boolean
  onClose: () => void
  sources: CalendarSource[]
  loadingId: string | null
  maxSources: number
  onAdd: ReturnType<typeof useNaverCalendar>['addSource']
  onRemove: (id: string) => void
}

interface AddForm {
  name: string
  color: string
  url: string
  error: string
  loading: boolean
}

const DEFAULT_FORM: AddForm = {
  name: '',
  color: CALENDAR_COLORS[0],
  url: '',
  error: '',
  loading: false,
}

interface SourceCardProps {
  source: CalendarSource
  onRemove: (id: string) => void
}

const SourceCard = ({source, onRemove}: SourceCardProps) => {
  const [confirming, setConfirming] = useState(false)

  return (
    <Box sx={{
      px: 1.5, py: 1, borderRadius: 1.5,
      border: '1px solid', borderColor: 'divider',
      bgcolor: 'background.paper',
    }}>
      {confirming ? (
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="caption" sx={{fontSize: '0.75rem', color: 'text.secondary'}}>
            <Box component="span" sx={{color: source.color, fontWeight: 700}}>
              {source.name}
            </Box>
            을(를) 해제할까요?
          </Typography>
          <Stack direction="row" spacing={0.75}>
            <Button size="small" color="error" variant="contained"
              sx={{minWidth: 0, px: 1.25, py: 0.25, fontSize: '0.72rem', height: 24}}
              onClick={() => onRemove(source.id)}>
              해제
            </Button>
            <Button size="small" variant="outlined"
              sx={{minWidth: 0, px: 1.25, py: 0.25, fontSize: '0.72rem', height: 24}}
              onClick={() => setConfirming(false)}>
              취소
            </Button>
          </Stack>
        </Stack>
      ) : (
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{width: 10, height: 10, borderRadius: '50%', bgcolor: source.color, flexShrink: 0}} />
          <Box sx={{flex: 1, minWidth: 0}}>
            <Typography sx={{fontSize: '0.8rem', fontWeight: 600, lineHeight: 1.3,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
              {source.name}
            </Typography>
            {source.error ? (
              <Typography sx={{fontSize: '0.68rem', color: 'warning.main'}}>
                ⚠ {source.error}
              </Typography>
            ) : source.eventCount !== undefined ? (
              <Typography sx={{fontSize: '0.68rem', color: 'text.disabled'}}>
                {source.eventCount}개 이벤트
                {source.lastSynced ? ` · ${formatRelative(source.lastSynced)}` : ''}
              </Typography>
            ) : null}
          </Box>
          <IconButton size="small" onClick={() => setConfirming(true)} aria-label={`${source.name} 해제`}
            sx={{color: 'text.disabled', '&:hover': {color: 'error.main'}}}>
            <CloseIcon sx={{fontSize: 14}} />
          </IconButton>
        </Stack>
      )}
    </Box>
  )
}

function formatRelative(iso: string): string {
  try {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000
    if (diff < 60) return '방금 전'
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
    return `${Math.floor(diff / 86400)}일 전`
  } catch {
    return ''
  }
}

export const NaverCalendarDrawer = ({
  open, onClose, sources, loadingId, maxSources, onAdd, onRemove,
}: NaverCalendarDrawerProps) => {
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState<AddForm>(DEFAULT_FORM)
  const [showGuide, setShowGuide] = useState(false)
  const [showNotice, setShowNotice] = useState(false)

  const handleAdd = async () => {
    if (!form.url.trim()) {
      setForm(f => ({...f, error: 'URL을 입력해주세요'}))
      return
    }
    setForm(f => ({...f, loading: true, error: ''}))
    const result = await onAdd(form.url.trim(), form.name, form.color)
    if (result.success) {
      setForm(DEFAULT_FORM)
      setShowAddForm(false)
    } else {
      setForm(f => ({...f, loading: false, error: result.error ?? '연결 실패'}))
    }
  }

  const canAdd = sources.length < maxSources && !showAddForm

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{paper: {sx: {width: {xs: '100vw', sm: 360}, overflowX: 'hidden'}}}}>
      <Box sx={{display: 'flex', flexDirection: 'column', height: '100%'}}>

        {/* 헤더 */}
        <Box sx={{px: 2.5, py: 2, display: 'flex', alignItems: 'center',
          borderBottom: '1px solid', borderColor: 'divider'}}>
          <Typography variant="h6" sx={{fontWeight: 700, fontSize: '1rem', flex: 1}}>
            📅 내 캘린더 (Google)
          </Typography>
          <IconButton size="small" onClick={onClose} aria-label="닫기">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{flex: 1, overflowY: 'auto', px: 2.5, py: 2}}>

          {/* 소스 목록 */}
          {sources.length > 0 ? (
            <Stack spacing={1} sx={{mb: 2}}>
              <Typography variant="caption" sx={{fontWeight: 700, color: 'text.secondary',
                fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 0.5}}>
                연결된 캘린더
              </Typography>
              {sources.map(s => (
                <SourceCard key={s.id} source={s} onRemove={onRemove} />
              ))}
            </Stack>
          ) : !showAddForm ? (
            <Box sx={{py: 3, textAlign: 'center'}}>
              <Typography color="text.secondary" sx={{fontSize: '0.85rem'}}>
                연결된 캘린더가 없습니다
              </Typography>
            </Box>
          ) : null}

          {/* 추가 버튼 */}
          {canAdd && loadingId === null && (
            <Button
              startIcon={<AddIcon />}
              variant="outlined"
              fullWidth
              size="small"
              onClick={() => setShowAddForm(true)}
              sx={{mb: 1.5}}>
              캘린더 추가 {sources.length > 0 ? `(최대 ${maxSources}개)` : ''}
            </Button>
          )}

          {/* 추가 폼 */}
          {showAddForm && (
            <Box sx={{
              p: 1.5, borderRadius: 1.5,
              border: '1px solid', borderColor: 'primary.main',
              bgcolor: 'action.hover', mb: 1.5,
            }}>
              <Typography sx={{fontWeight: 700, fontSize: '0.85rem', mb: 1.5}}>
                캘린더 추가
              </Typography>

              {/* 이름 */}
              <TextField
                label="이름 (선택)"
                size="small"
                fullWidth
                value={form.name}
                onChange={e => setForm(f => ({...f, name: e.target.value}))}
                placeholder={`내 캘린더 ${sources.length + 1}`}
                sx={{mb: 1.5}}
                disabled={form.loading}
              />

              {/* 색상 */}
              <Box sx={{mb: 1.5}}>
                <Typography sx={{fontSize: '0.75rem', color: 'text.secondary', mb: 0.75}}>
                  색상
                </Typography>
                <Stack direction="row" spacing={1}>
                  {CALENDAR_COLORS.map(c => (
                    <Box
                      key={c}
                      role="radio"
                      aria-label={c}
                      aria-checked={form.color === c}
                      tabIndex={0}
                      onClick={() => setForm(f => ({...f, color: c}))}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setForm(f => ({...f, color: c})) }}
                      sx={{
                        width: 22, height: 22, borderRadius: '50%', bgcolor: c,
                        cursor: 'pointer', flexShrink: 0,
                        outline: form.color === c ? `3px solid ${c}` : '2px solid transparent',
                        outlineOffset: 2,
                        transition: 'outline 0.1s',
                      }}
                    />
                  ))}
                </Stack>
              </Box>

              {/* URL */}
              <TextField
                label="iCal URL"
                size="small"
                fullWidth
                value={form.url}
                onChange={e => setForm(f => ({...f, url: e.target.value, error: ''}))}
                placeholder="https://calendar.google.com/calendar/ical/..."
                error={Boolean(form.error)}
                helperText={form.error || undefined}
                sx={{mb: 0.75}}
                disabled={form.loading}
              />

              {/* URL 복사 방법 */}
              <Button
                size="small"
                variant="text"
                sx={{fontSize: '0.72rem', color: 'text.secondary', p: 0, mb: 1.5, textTransform: 'none'}}
                onClick={() => setShowGuide(v => !v)}>
                URL 복사 방법 {showGuide ? '▲' : '▸'}
              </Button>
              <Collapse in={showGuide}>
                <Box sx={{mb: 1.5, p: 1, bgcolor: 'background.paper', borderRadius: 1,
                  border: '1px solid', borderColor: 'divider'}}>
                  <Typography sx={{fontSize: '0.72rem', color: 'text.secondary', lineHeight: 1.8}}>
                    1. Google 캘린더 → 설정(⚙) → 내 캘린더 선택<br />
                    2. '캘린더 통합' 섹션에서 'iCal 형식의 비공개 주소' 복사<br />
                    3. 복사한 URL을 위 입력창에 붙여넣기
                  </Typography>
                </Box>
              </Collapse>

              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={() => { setShowAddForm(false); setForm(DEFAULT_FORM) }}
                  disabled={form.loading}>
                  취소
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  fullWidth
                  onClick={() => { void handleAdd() }}
                  disabled={form.loading}
                  startIcon={form.loading ? <CircularProgress size={14} color="inherit" /> : undefined}>
                  연결하기
                </Button>
              </Stack>
            </Box>
          )}

          {/* 로딩 중 표시 */}
          {loadingId !== null && (
            <Stack direction="row" alignItems="center" spacing={1} sx={{py: 1}}>
              <CircularProgress size={14} />
              <Typography variant="caption" color="text.secondary">연결 중...</Typography>
            </Stack>
          )}

          <Divider sx={{my: 2}} />

          {/* 안내 */}
          <Button
            size="small"
            variant="text"
            startIcon={<InfoOutlinedIcon sx={{fontSize: 14}} />}
            sx={{fontSize: '0.72rem', color: 'text.secondary', p: 0, textTransform: 'none', mb: 0.5}}
            onClick={() => setShowNotice(v => !v)}>
            이용 안내 {showNotice ? '▲' : '▸'}
          </Button>
          <Collapse in={showNotice}>
            <Box sx={{pl: 0.5}}>
              {[
                '반복 일정은 첫 회차만 표시됩니다',
                '페이지 로드 시 자동으로 동기화됩니다',
                '읽기 전용으로 앱에서 수정·삭제할 수 없습니다',
                '설정은 이 기기에만 저장됩니다',
              ].map(text => (
                <Stack key={text} direction="row" spacing={0.5} alignItems="flex-start">
                  <Typography sx={{fontSize: '0.68rem', color: 'text.disabled', lineHeight: 1.6}}>•</Typography>
                  <Typography sx={{fontSize: '0.68rem', color: 'text.secondary', lineHeight: 1.6}}>
                    {text}
                  </Typography>
                </Stack>
              ))}
            </Box>
          </Collapse>

          {/* 연결 상태 요약 칩 */}
          {sources.length > 0 && (
            <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{mt: 2}}>
              {sources.filter(s => !s.error).map(s => (
                <Chip
                  key={s.id}
                  size="small"
                  label={`${s.name} ${s.eventCount ?? 0}개`}
                  sx={{
                    height: 20, fontSize: '0.65rem',
                    bgcolor: `${s.color}22`, color: s.color,
                    border: `1px solid ${s.color}44`,
                  }}
                />
              ))}
              {sources.filter(s => s.error).map(s => (
                <Chip
                  key={s.id}
                  size="small"
                  label={`${s.name} ⚠`}
                  color="warning"
                  variant="outlined"
                  sx={{height: 20, fontSize: '0.65rem'}}
                />
              ))}
            </Stack>
          )}
        </Box>
      </Box>
    </Drawer>
  )
}
