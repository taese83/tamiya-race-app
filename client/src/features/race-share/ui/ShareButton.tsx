import {useState} from 'react'
import {IconButton, Tooltip, Snackbar, Alert} from '@mui/material'
import ShareIcon from '@mui/icons-material/Share'
import CheckIcon from '@mui/icons-material/Check'
import {encodeSettings} from '@/shared/lib/raceSettings'
import type {SavedSettings} from '@/shared/lib/raceSettings'

interface ShareButtonProps {
  settings?: SavedSettings
}

function buildShareUrl(settings: SavedSettings | undefined): string {
  const base = `${window.location.protocol}//${window.location.host}${window.location.pathname}`
  if (!settings) return base
  const hasContent = settings.view || settings.cview
    || (settings.venues?.length ?? 0) > 0
    || (settings.cats?.length ?? 0) > 0
  if (!hasContent) return base
  const encoded = encodeSettings(settings)
  return encoded ? `${base}?s=${encoded}` : base
}

export const ShareButton = ({settings}: ShareButtonProps) => {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  const handleShare = async () => {
    const shareUrl = buildShareUrl(settings)

    if (navigator.share) {
      try {
        await navigator.share({
          title: '타미야 대회 일정',
          text: '타미야 매장·경기장 대회 일정을 확인하세요',
          url: shareUrl,
        })
        return
      } catch {
        // 취소 또는 미지원 시 클립보드 fallback
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      // clipboard API 미지원 환경 — silent fail (execCommand는 deprecated)
    }
    setCopied(true)
    setOpen(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <Tooltip title={copied ? '링크 복사됨!' : '현재 설정 상태 공유'}>
        <IconButton
          size="small"
          onClick={handleShare}
          aria-label="공유하기"
          color={copied ? 'primary' : 'default'}>
          {copied ? <CheckIcon fontSize="small" /> : <ShareIcon fontSize="small" />}
        </IconButton>
      </Tooltip>

      <Snackbar
        open={open}
        autoHideDuration={2500}
        onClose={() => setOpen(false)}
        anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}>
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setOpen(false)}
          sx={{width: '100%', fontSize: '0.85rem'}}>
          링크가 클립보드에 복사됐습니다
        </Alert>
      </Snackbar>
    </>
  )
}
