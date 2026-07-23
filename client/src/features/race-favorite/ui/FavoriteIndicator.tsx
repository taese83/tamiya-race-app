import {Box} from '@mui/material'
import type {SxProps, Theme} from '@mui/material/styles'
import TurnedInIcon from '@mui/icons-material/TurnedIn'

interface FavoriteIndicatorProps {
  isFavorite: boolean
  size?: number
  tone?: 'default' | 'onColor'
  cornerAbsolute?: boolean
}

const CORNER_SX: SxProps<Theme> = {
  position: 'absolute',
  top: 2,
  right: 2,
  display: 'inline-flex',
  pointerEvents: 'none',
}

const INLINE_SX: SxProps<Theme> = {
  display: 'inline-flex',
  flexShrink: 0,
  pointerEvents: 'none',
}

/**
 * 리스트/캘린더 셀에 즐겨찾기 상태를 표시하는 읽기 전용 아이콘.
 * FavoriteToggle과 달리 IconButton이 아니라 시각 지시만 담당한다.
 */
export const FavoriteIndicator = ({
  isFavorite,
  size = 14,
  tone = 'default',
  cornerAbsolute = false,
}: FavoriteIndicatorProps) => {
  if (!isFavorite) return null
  const color = tone === 'onColor' ? '#fff' : 'primary.main'
  return (
    <Box aria-label="즐겨찾기" sx={cornerAbsolute ? CORNER_SX : INLINE_SX}>
      <TurnedInIcon sx={{fontSize: size, color}} />
    </Box>
  )
}
