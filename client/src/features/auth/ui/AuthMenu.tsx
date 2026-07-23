import {useState} from 'react'
import {Avatar, CircularProgress, IconButton, Menu, MenuItem, Tooltip, ListItemIcon, ListItemText} from '@mui/material'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import LogoutIcon from '@mui/icons-material/Logout'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck'
import {loginWithGoogle, useSession, useLogout} from '../model/useSession'

export interface AuthMenuProps {
  /** '참여 경기 보기' 클릭 콜백. participationCount=0이면 메뉴에서 자동 숨김. */
  onShowParticipating?: () => void
  /** 참여 경기 수. 0이면 '참여 경기 보기' 메뉴 항목을 숨긴다. */
  participationCount?: number
  /** '스테이션 점수 확인' 클릭 콜백 */
  onShowScores?: () => void
}

export const AuthMenu = ({onShowParticipating, participationCount = 0, onShowScores}: AuthMenuProps) => {
  const {user, isLoading} = useSession()
  const logout = useLogout()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const open = Boolean(anchorEl)

  if (isLoading) {
    return <CircularProgress size={20} thickness={5} sx={{color: 'text.disabled'}} />
  }

  if (!user) {
    return (
      <Tooltip title="Google 계정으로 로그인">
        <IconButton
          size="small"
          onClick={loginWithGoogle}
          aria-label="Google 계정으로 로그인"
          sx={{p: 0}}>
          <Avatar
            sx={{
              width: 28, height: 28,
              bgcolor: 'transparent',
              color: 'text.disabled',
              border: '1px solid',
              borderColor: 'divider',
              '&:hover': {borderColor: 'primary.main', color: 'primary.main'},
            }}>
            <PersonOutlineIcon sx={{fontSize: 18}} />
          </Avatar>
        </IconButton>
      </Tooltip>
    )
  }

  const handleClose = () => setAnchorEl(null)

  return (
    <>
      <Tooltip title={user.name}>
        <Avatar
          src={user.picture}
          alt={user.name}
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            width: 28, height: 28, cursor: 'pointer',
            fontSize: '0.75rem',
            bgcolor: 'primary.main',
            '&:hover': {opacity: 0.85},
          }}>
          {user.name.slice(0, 1)}
        </Avatar>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{vertical: 'bottom', horizontal: 'right'}}
        transformOrigin={{vertical: 'top', horizontal: 'right'}}
        slotProps={{paper: {sx: {mt: 0.5, minWidth: 200}}}}>
        {onShowParticipating && participationCount > 0 && (
          <MenuItem onClick={() => { handleClose(); onShowParticipating() }}>
            <ListItemIcon><PlaylistAddCheckIcon fontSize="small" /></ListItemIcon>
            <ListItemText
              primary={`참여 경기 보기 (${participationCount})`}
              primaryTypographyProps={{fontSize: '0.85rem'}}
            />
          </MenuItem>
        )}
        {onShowScores && (
          <MenuItem onClick={() => { handleClose(); onShowScores() }}>
            <ListItemIcon><EmojiEventsIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="스테이션 점수 확인" primaryTypographyProps={{fontSize: '0.85rem'}} />
          </MenuItem>
        )}
        <MenuItem onClick={() => { handleClose(); void logout() }}>
          <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="로그아웃" primaryTypographyProps={{fontSize: '0.85rem'}} />
        </MenuItem>
      </Menu>
    </>
  )
}
