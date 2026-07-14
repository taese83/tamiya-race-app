import {useState} from 'react'
import {IconButton, Tooltip, Snackbar, Alert} from '@mui/material'
import ShareIcon from '@mui/icons-material/Share'
import CheckIcon from '@mui/icons-material/Check'

interface ShareButtonProps {
  /** 공유할 URL — 생략 시 window.location.href */
  url?: string
}

export const ShareButton = ({url}: ShareButtonProps) => {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  const handleShare = async () => {
    const shareUrl = url ?? window.location.href

    // Web Share API 지원 환경 (모바일)
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

    // 클립보드 복사
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setOpen(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API 실패 시 execCommand fallback
      const textarea = document.createElement('textarea')
      textarea.value = shareUrl
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setOpen(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <>
      <Tooltip title={copied ? '링크 복사됨!' : '현재 필터 상태 공유'}>
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
