import React from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'

export type ConfirmInfo = {
  open: boolean
  resolve?: (value: boolean) => void
}

type ConfirmModalProps = ConfirmInfo &{
  title: string
  text: string
  actions?: {
    label: string
    value: boolean
  }[]
}

const ConfirmModal = (props: ConfirmModalProps) => {
  const {
    open, title, resolve, text, actions,
  } = props

  return (
    <Dialog
      open={open}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{text}</DialogContentText>
      </DialogContent>
      <DialogActions>
        {
          actions ?
            actions.map((action) => (
              <Button
                key={action.value.toString()}
                onClick={() => resolve &&resolve(action.value)}
              >
                {action.label}
              </Button>
            )) :
            null
        }
      </DialogActions>
    </Dialog>
  )
}

export default ConfirmModal

export const APPEND_PATH_CONFIRM_INFO = {
  title: 'path selection',
  text: 'append to current path or create new path?',
  actions: [
    {
      label: 'create',
      value: false,
    },
    {
      label: 'append',
      value: true,
    },
  ],
}
