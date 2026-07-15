import {Box, Stack, Typography} from '@mui/material'
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk'

interface TransferSegmentProps {
  toVenue: string
  toVenueColor: string  // 하단 점선에 적용
}

export const TransferSegment = ({toVenue, toVenueColor}: TransferSegmentProps) => (
  <Box role="separator" aria-label={`${toVenue}으로 이동 구간`}>
    <Box sx={{borderTop: '1px dashed', borderColor: 'divider'}} />
    <Stack
      direction="row"
      alignItems="center"
      spacing={0.75}
      sx={{px: 2, py: 1, bgcolor: 'action.hover'}}>
      <DirectionsWalkIcon aria-hidden fontSize="small" sx={{color: 'text.secondary'}} />
      <Typography variant="caption" color="text.secondary">
        → {toVenue}으로 이동
      </Typography>
    </Stack>
    <Box sx={{borderTop: '1px dashed', borderColor: toVenueColor, opacity: 0.5}} />
  </Box>
)
