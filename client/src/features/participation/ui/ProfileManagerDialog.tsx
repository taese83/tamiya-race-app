import {useState} from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, TextField, Button, Stack, IconButton, Chip, Alert, Tooltip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import {useSession} from '@/features/auth'
import {useProfiles, useCreateProfile, useUpdateProfile, useDeleteProfile} from '../model/useProfiles'
import type {Profile} from '../model/useProfiles'

interface ProfileManagerDialogProps {
  open: boolean
  onClose: () => void
}

export const ProfileManagerDialog = ({open, onClose}: ProfileManagerDialogProps) => {
  const {user} = useSession()
  const {profiles} = useProfiles(open && user != null)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const create = useCreateProfile()
  const update = useUpdateProfile()
  const remove = useDeleteProfile()

  const submitCreate = () => {
    const t = newName.trim()
    if (!t) return
    create.mutate(t, {
      onSuccess: () => { setNewName('') },
    })
  }

  const submitRename = (profile: Profile) => {
    const t = editingName.trim()
    if (!t || t === profile.name) { setEditingId(null); return }
    update.mutate({id: profile.id, name: t}, {
      onSuccess: () => { setEditingId(null) },
    })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{fontSize: '1rem', fontWeight: 700, pb: 1}}>프로필 관리</DialogTitle>
      <DialogContent>
        <Typography variant="caption" color="text.secondary" sx={{fontSize: '0.72rem', display: 'block', mb: 1.5}}>
          아이·가족과 함께 참여할 때 프로필을 추가해 참여 기록을 나눠 관리하세요.
        </Typography>

        {(create.error || update.error || remove.error) && (
          <Alert severity="error" sx={{fontSize: '0.75rem', mb: 1.5}}>
            {create.error?.message ?? update.error?.message ?? remove.error?.message}
          </Alert>
        )}

        <Stack spacing={0.75}>
          {profiles.map(p => {
            const isEditing = editingId === p.id
            return (
              <Box
                key={p.id}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1,
                  px: 1.25, py: 0.75, borderRadius: 1,
                  bgcolor: 'action.hover',
                }}>
                {isEditing ? (
                  <>
                    <TextField
                      size="small"
                      value={editingName}
                      autoFocus
                      onChange={e => setEditingName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') submitRename(p)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      sx={{flex: 1}}
                    />
                    <IconButton size="small" onClick={() => submitRename(p)} aria-label="저장">
                      <CheckIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => setEditingId(null)} aria-label="취소">
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </>
                ) : (
                  <>
                    <Typography variant="body2" sx={{fontSize: '0.9rem', fontWeight: p.is_default ? 700 : 500, flex: 1}}>
                      {p.name}
                    </Typography>
                    {p.is_default && (
                      <Chip label="기본" size="small" color="primary" sx={{height: 18, fontSize: '0.65rem'}} />
                    )}
                    <Tooltip title={p.is_default ? '이미 기본' : '기본으로 지정'}>
                      <span>
                        <IconButton
                          size="small"
                          disabled={p.is_default || update.isPending}
                          onClick={() => update.mutate({id: p.id, isDefault: true})}
                          aria-label="기본으로 지정">
                          {p.is_default ? <StarIcon fontSize="small" sx={{color: 'primary.main'}} /> : <StarBorderIcon fontSize="small" />}
                        </IconButton>
                      </span>
                    </Tooltip>
                    <IconButton
                      size="small"
                      onClick={() => { setEditingId(p.id); setEditingName(p.name) }}
                      aria-label="이름 변경">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <Tooltip title={p.is_default ? '기본 프로필은 삭제할 수 없습니다' : '삭제'}>
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={p.is_default || remove.isPending}
                          onClick={() => {
                            if (confirm(`"${p.name}" 프로필을 삭제하시겠어요? 이 프로필의 모든 참여 기록이 사라집니다.`)) {
                              remove.mutate(p.id)
                            }
                          }}
                          aria-label="삭제">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </>
                )}
              </Box>
            )
          })}
        </Stack>

        <Stack direction="row" spacing={1} sx={{mt: 2}}>
          <TextField
            size="small"
            placeholder="새 프로필 이름"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitCreate() }}
            sx={{flex: 1}}
          />
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon fontSize="small" />}
            disabled={!newName.trim() || create.isPending}
            onClick={submitCreate}>
            추가
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>
    </Dialog>
  )
}

