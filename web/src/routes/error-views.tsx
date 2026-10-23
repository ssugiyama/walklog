import ListIcon from '@mui/icons-material/List'
import Fab from '@mui/material/Fab'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { HttpError } from '@/server/http-error'

const paperSx = {
  width: '100%',
  textAlign: 'center',
  padding: 2,
  minHeight: 100,
}

function HomeFab() {
  return (
    <Fab
      sx={{ float: 'left', marginLeft: 1, marginTop: 1 }}
      size="small"
      color="primary"
      component="a"
      href="/"
    >
      <ListIcon />
    </Fab>
  )
}

export function NotFound() {
  return (
    <Paper sx={paperSx}>
      <HomeFab />
      <Typography variant="h6">Not Found</Typography>
      <Typography variant="body1" color="error">
        the requested resource is not found or deleted
      </Typography>
    </Paper>
  )
}

export function Forbidden() {
  return (
    <Paper sx={paperSx}>
      <HomeFab />
      <Typography variant="h6">Forbidden</Typography>
      <Typography variant="body1" color="error">
        You do not have permission
      </Typography>
    </Paper>
  )
}

export function Unauthorized() {
  return (
    <Paper sx={paperSx}>
      <HomeFab />
      <Typography variant="h6">Unauthorized</Typography>
      <Typography variant="body1" color="error">
        authorization required
      </Typography>
    </Paper>
  )
}

export function AppError({ error }: { error?: Error }) {
  return (
    <Paper sx={paperSx}>
      <HomeFab />
      <Typography variant="h6">Error</Typography>
      <Typography variant="body1">{error?.message}</Typography>
    </Paper>
  )
}

// Replaces Next's not-found / forbidden / unauthorized / error files: the
// status of an HttpError picks the same screen those files rendered.
export function ErrorView({ error }: { error: unknown }) {
  if (error instanceof HttpError) {
    switch (error.status) {
      case 401:
        return <Unauthorized />
      case 403:
        return <Forbidden />
      case 404:
        return <NotFound />
    }
  }
  return <AppError error={error instanceof Error ? error : undefined} />
}
