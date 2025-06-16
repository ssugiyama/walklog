import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Link from 'next/link'
import ListIcon from '@mui/icons-material/List'
import Fab from '@mui/material/Fab'

export default function NotFound() {
  return (
    <Paper sx={{ width: '100%', textAlign: 'center', padding: 2, minHeight: 100 }}>
      <Fab sx={{ float: 'left', marginLeft: 1, marginTop: 1 }} size="small" color="primary" component={Link} href="/"><ListIcon /></Fab>
      <Typography variant="h6">Not Found</Typography>
      <Typography variant="body1">the requested resource is not found or deleted</Typography>
    </Paper>
  )
}
