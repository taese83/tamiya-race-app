import {Chip} from '@mui/material'

const CATEGORY_COLORS: Record<string, string> = {
  'M1 클래스': '#e53935',
  'M2 클래스': '#1e88e5',
  'M2B 클래스': '#8e24aa',
  'M3 클래스': '#43a047',
  'OPEN 클래스': '#fb8c00',
  'OPEN': '#fb8c00',
}

interface CategoryChipProps {
  category: string
}

export const CategoryChip = ({category}: CategoryChipProps) => {
  // 선착순 같은 부연설명 제거 후 매칭
  const baseKey = Object.keys(CATEGORY_COLORS).find(k =>
    category.includes(k.replace(' 클래스', ''))
  )
  const color = baseKey ? CATEGORY_COLORS[baseKey] : '#546e7a'

  return (
    <Chip
      label={category}
      size="small"
      sx={{
        bgcolor: color,
        color: '#fff',
        fontWeight: 600,
        fontSize: '0.72rem',
        height: 22,
        '& .MuiChip-label': {px: 1},
      }}
    />
  )
}
