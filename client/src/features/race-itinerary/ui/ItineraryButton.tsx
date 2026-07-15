import {useState} from 'react'
import {Button} from '@mui/material'
import AltRouteIcon from '@mui/icons-material/AltRoute'
import type {RaceEntry} from '@/entities/race'
import type {ItineraryOptions} from './_types'
import {ItinerarySetupDialog} from './ItinerarySetupDialog'

interface ItineraryButtonProps {
  races: RaceEntry[]
  dateKey: string
  open: boolean
  /** 설정 완료 후 옵션을 받아 계산 실행 */
  onOpen: (options: ItineraryOptions) => void
  onClose: () => void
}

export const ItineraryButton = ({races, dateKey, open, onOpen, onClose}: ItineraryButtonProps) => {
  const [dialogOpen, setDialogOpen] = useState(false)

  const timedRaces = races.filter(r => r.time && r.time.trim() !== '')
  if (timedRaces.length < 2) return null

  const handleButtonClick = () => {
    if (open) {
      onClose()
    } else {
      setDialogOpen(true)
    }
  }

  const handleDialogConfirm = (options: ItineraryOptions) => {
    setDialogOpen(false)
    onOpen(options)
  }

  return (
    <>
      <Button
        size="small"
        variant={open ? 'contained' : 'outlined'}
        color="primary"
        startIcon={<AltRouteIcon />}
        aria-expanded={open}
        aria-controls={`route-map-${dateKey}`}
        aria-label={open ? `${dateKey} 최적 동선 닫기` : `${dateKey} 최적 동선 보기`}
        onClick={handleButtonClick}
        sx={{whiteSpace: 'nowrap', flexShrink: 0}}>
        동선
      </Button>

      <ItinerarySetupDialog
        open={dialogOpen}
        races={races}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleDialogConfirm}
      />
    </>
  )
}
