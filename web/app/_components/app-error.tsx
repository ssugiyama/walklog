'use client'
import ListIcon from '@mui/icons-material/List'
import Fab from '@mui/material/Fab'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'

type AppErrorProps = {
  // A real Error instance when this renders as the app/error.tsx boundary
  // (Next.js's own contract for a thrown/rendering error); a plain string
  // when a Server Action surfaces a message through state.error instead of
  // throwing (see types.ts's BaseState.error - a plain string is what
  // survives React Flight's production serialization, not an Error).
  error?: Error | string | null
}

const AppError = ({ error }: AppErrorProps) => {
  const message = typeof error === 'string' ? error : error?.message
  return (
    <Paper
      sx={{ width: '100%', textAlign: 'center', padding: 2, minHeight: 100 }}
    >
      <Fab
        sx={{ float: 'left', marginLeft: 1, marginTop: 1 }}
        size="small"
        color="primary"
        component="a"
        href="/"
      >
        <ListIcon />
      </Fab>
      <Typography variant="h6">Error</Typography>
      <Typography variant="body1">{message}</Typography>
    </Paper>
  )
}

export default AppError
