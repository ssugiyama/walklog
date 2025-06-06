'use client'
import React, { useState, useCallback, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Button from '@mui/material/Button'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import Divider from '@mui/material/Divider'
import Box from '@mui/material/Box'
import Avatar from '@mui/material/Avatar'
import MuiLink from '@mui/material/Link'
import SearchForm from './search-form'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { idToUrl } from '../utils/meta-utils'
import { useData } from '../utils/data-context'
import { useUserContext } from '../utils/user-context'
const SearchBox = () => {
  const router = useRouter()
  const { users } = useUserContext()
  const [data] = useData()
  console.log('data', data)
  const { offset, count, rows } = data
  const [showDistance, setShowDistance] = useState(true)
  const searchParams = useSearchParams()
  const handleShowDistance = useCallback((e) => {
    setShowDistance(e.target.value === 'true')  
  }, [])
  useEffect(() => {
    const index = searchParams.get('index')
    if (index !== null) {
      const i = Number(index)
      const id = rows[i]?.id
      console.log('rows', rows)
      console.log('id', id)
      if (id) {
        const newParams = new URLSearchParams(searchParams.toString())
        newParams.delete('index')
        router.replace(idToUrl(id, newParams))
      }
    }
  }, [offset])
  const moreUrl = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('limit', offset + 20)
    return `?${params.toString()}`
  }, [searchParams, offset])

  const userObjs = {}
  users.forEach((u) => { userObjs[u.uid] = u })
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
      <Divider sx={{ m: (theme) => theme.spacing(2) }} />
      <Box display="flex" sx={{ m: 1 }}>
        <Typography variant="body1" sx={{ display: 'inline-block' }}>
          {
            (() => {

              if (data.error) {
                return (
                  <span>
                    Error:
                    {data.error}
                  </span>
                )
              }
              if (data.isPending) {
                return <span>Searching now...</span>
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
                      {rows.length}
                      {' '}
                      /
                      {' '}
                      {count}
                      {' '}
                      walks
                    </span>
                  )
              }
            })()
          }
        </Typography>
      </Box>
      <Table sx={{ cursor: 'pointer' }}>
        <TableHead>
          <TableRow>
            <TableCell sx={sxCell}><Typography variant="body2">user</Typography></TableCell>
            <TableCell sx={sxCell}><Typography variant="body2">date</Typography></TableCell>
            <TableCell sx={sxCell}><Typography variant="body2">title</Typography></TableCell>
            <TableCell sx={sxCell}>
              {
                rows.length > 0 && rows[0].distance !== undefined ?
                  (
                    <Select value={showDistance} onChange={handleShowDistance}>
                      <MenuItem value="true"><Typography variant="body2">distance</Typography></MenuItem>
                      <MenuItem value="false"><Typography variant="body2">length</Typography></MenuItem>
                    </Select>
                  ) : (<Typography variant="body1">length</Typography>)
              }
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((item) => {
            const u = userObjs[item.uid]
            return (
              <TableRow
                sx={{
                  '&:nth-of-type(odd)': { backgroundColor: 'background.default' },
                  filter: item.draft ? 'opacity(.5)' : 'opacity(1)',
                }}
                key={item.id}
              >
                <TableCell sx={sxCell}>
                  {
                    u &&
                    (
                      <Avatar
                        alt={u.displayName}
                        src={u.photoURL}
                        sx={{ width: 24, height: 24 }}
                      />
                    )
                  }
                </TableCell>
                <TableCell sx={sxCell}><MuiLink href={idToUrl(item.id, searchParams)} component={Link} color="primary" underline="hover">{item.date}</MuiLink></TableCell>
                <TableCell sx={sxCell}><MuiLink href={idToUrl(item.id, searchParams)} component={Link} color="primary" underline="hover">{item.title}</MuiLink></TableCell>
                <TableCell sx={sxCell}>
                  {
                    showDistance && item.distance !== undefined ?
                      item.distance.toFixed(1) :
                      item.length.toFixed(1)
                  }
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      {
        offset > 0 &&
        (
          <Button
            variant="outlined"
            sx={{ width: 'calc(100% - 20px)', m: 1 }}
            color="primary"
            component={Link}
            href={moreUrl}
            scroll={false}
          >
            <ExpandMoreIcon sx={{ mr: 1 }} />
            {' '}
            more
          </Button>
        )
      }
    </Paper>
  )
}

export default SearchBox
