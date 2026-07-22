'use client'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import MuiLink from '@mui/material/Link'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { UserT } from '@/types'
import { useData } from '../utils/data-context'
import { idToShowUrl } from '../utils/meta-utils'
import { useUserContext } from '../utils/user-context'
import SearchForm from './search-form'

const SearchBox = () => {
  const router = useRouter()
  const { users } = useUserContext()
  const [data] = useData()
  const { offset, count, rows } = data
  const [showDistance, setShowDistance] = useState(true)
  const searchParams = useSearchParams()
  const filter = searchParams.get('filter') || ''
  const handleShowDistance = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setShowDistance(e.target.value === 'true')
    },
    [],
  )
  useEffect(() => {
    const index = searchParams.get('index')
    if (index !== null) {
      const i = Number(index)
      const id = rows[i]?.id
      if (id) {
        const newParams = new URLSearchParams(searchParams.toString())
        newParams.delete('index')
        router.replace(idToShowUrl(id, newParams))
      }
    }
  }, [offset])
  const moreUrl = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('limit', (offset + 20).toString())
    return `?${params.toString()}`
  }, [searchParams, offset])

  const userObjs: Record<string, UserT> = {}
  users.forEach((u) => {
    userObjs[u.uid] = u
  })
  const sxCell = {
    padding: 1,
    '&:nth-of-type(1)': {
      width: 40,
      whiteSpace: 'nowrap',
    },
    '&:nth-of-type(2)': {
      width: 80,
      whiteSpace: 'nowrap',
    },
    '&:nth-of-type(4)': {
      width: 40,
      textAlign: 'right',
    },
  }

  return (
    <Paper sx={{ p: 1 }} data-testid="SearchBox">
      <SearchForm />
      <Box sx={{ m: 1, display: 'flex' }}>
        <Typography variant="body1" sx={{ display: 'inline-block' }}>
          {(() => {
            if (data.isPending) {
              return <span>Searching...</span>
            }
            switch (count) {
              case null:
                return <span>successfully saved</span>
              case 0:
                return <span>No results</span>
              case 1:
                return <span>1 / 1 item</span>
              default:
                return (
                  <span>
                    {rows.length} / {count} walks
                  </span>
                )
            }
          })()}
        </Typography>
      </Box>
      <Table sx={{ cursor: 'pointer' }}>
        <TableHead>
          <TableRow>
            <TableCell sx={sxCell}>
              <Typography variant="body2">user</Typography>
            </TableCell>
            <TableCell sx={sxCell}>
              <Typography variant="body2">date</Typography>
            </TableCell>
            <TableCell sx={sxCell}>
              <Typography variant="body2">title</Typography>
            </TableCell>
            <TableCell sx={sxCell}>
              {rows.length > 0 &&
              (filter === 'hausdorff' || filter === 'frechet') ? (
                <Select
                  value={showDistance.toString()}
                  onChange={handleShowDistance}
                >
                  <MenuItem value="true">
                    <Typography variant="body2">distance</Typography>
                  </MenuItem>
                  <MenuItem value="false">
                    <Typography variant="body2">length</Typography>
                  </MenuItem>
                </Select>
              ) : (
                <Typography variant="body1">length</Typography>
              )}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((item) => {
            const u = userObjs[item.uid]
            return (
              <TableRow
                sx={{
                  '&:nth-of-type(odd)': {
                    backgroundColor: 'background.default',
                  },
                  filter: item.draft ? 'opacity(.5)' : 'opacity(1)',
                }}
                key={item.id}
              >
                <TableCell sx={sxCell}>
                  {u && (
                    <Avatar
                      alt={u.displayName}
                      src={u.photoURL}
                      sx={{ width: 24, height: 24 }}
                    />
                  )}
                </TableCell>
                <TableCell sx={sxCell}>
                  <MuiLink
                    href={idToShowUrl(item.id, searchParams)}
                    component={Link}
                    color="primary"
                    underline="hover"
                  >
                    {item.date}
                  </MuiLink>
                </TableCell>
                <TableCell sx={sxCell}>
                  <MuiLink
                    href={idToShowUrl(item.id, searchParams)}
                    component={Link}
                    color="primary"
                    underline="hover"
                  >
                    {item.title}
                  </MuiLink>
                </TableCell>
                <TableCell sx={sxCell}>
                  {showDistance &&
                  (filter === 'hausdorff' || filter === 'frechet')
                    ? item.distance?.toFixed(1)
                    : item.length.toFixed(1)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      {offset > 0 && (
        <Button
          variant="outlined"
          sx={{ width: 'calc(100% - 20px)', m: 1 }}
          color="primary"
          component={Link}
          href={moreUrl}
        >
          <ExpandMoreIcon sx={{ mr: 1 }} /> more
        </Button>
      )}
    </Paper>
  )
}

export default SearchBox
