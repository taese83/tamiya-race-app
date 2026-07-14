import {Chip} from '@mui/material'
import {getCategoryColor} from '@/entities/race'

interface CategoryChipProps {
  category: string
}

export const CategoryChip = ({category}: CategoryChipProps) => (
  <Chip
    label={category}
    size="small"
    sx={{
      bgcolor: getCategoryColor(category),
      color: '#fff',
      fontWeight: 600,
      fontSize: '0.72rem',
      height: 22,
      '& .MuiChip-label': {px: 1},
    }}
  />
)
