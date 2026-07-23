import {IconButton, Tooltip} from '@mui/material'
import TurnedInIcon from '@mui/icons-material/TurnedIn'
import TurnedInNotIcon from '@mui/icons-material/TurnedInNot'

interface FavoriteToggleProps {
  isFavorite: boolean
  disabled?: boolean
  onToggle: () => void
  size?: 'small' | 'medium'
}

export const FavoriteToggle = ({isFavorite, disabled = false, onToggle, size = 'small'}: FavoriteToggleProps) => {
  const label = isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'
  return (
    <Tooltip title={label}>
      <span>
        <IconButton
          size={size}
          disabled={disabled}
          onClick={onToggle}
          aria-label={label}
          aria-pressed={isFavorite}
          sx={{color: isFavorite ? 'primary.main' : 'text.secondary'}}>
          {isFavorite ? <TurnedInIcon fontSize={size} /> : <TurnedInNotIcon fontSize={size} />}
        </IconButton>
      </span>
    </Tooltip>
  )
}
