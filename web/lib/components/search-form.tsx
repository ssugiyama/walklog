import React, { useCallback } from 'react'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import Typography from '@mui/material/Typography'
import Link from 'next/link'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useQueryParam, StringParam, withDefault, NumberParam } from 'use-query-params'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useConfig } from '../utils/config'
import { useUserContext } from '../utils/user-context'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionActions from '@mui/material/AccordionActions'
import NumberField from './number-field'

const monthOptions = [
  { label: '-', value: '' },
  { label: 'Jan', value: 1 },
  { label: 'Feb', value: 2 },
  { label: 'Mar', value: 3 },
  { label: 'Apr', value: 4 },
  { label: 'May', value: 5 },
  { label: 'Jun', value: 6 },
  { label: 'Jul', value: 7 },
  { label: 'Aug', value: 8 },
  { label: 'Sep', value: 9 },
  { label: 'Oct', value: 10 },
  { label: 'Nov', value: 11 },
  { label: 'Dec', value: 12 },
]

const orderOptions = [
  { label: 'newest first', value: 'newest_first' },
  { label: 'oldest first', value: 'oldest_first' },
  { label: 'longest first', value: 'longest_first' },
  { label: 'shortest first', value: 'shortest_first' },
  { label: 'northernmost first', value: 'northernmost_first' },
  { label: 'southernmost first', value: 'southernmost_first' },
  { label: 'easternmost first', value: 'easternmost_first' },
  { label: 'westernmost first', value: 'westernmost_first' },
]

const orderOptionsWithNearest = [
  { label: 'nearest first', value: 'nearest_first' },
]

const currentYear = (new Date()).getFullYear()
const years: string[] = []
for (let y = currentYear; y >= 1997; y -= 1) {
  years.push(y.toString())
}

const SearchForm = () => {
  const config = useConfig()
  const defaultValues = {
    filter: '',
    user: '',
    month: '',
    year: '',
    order: 'newest_first',
    limit: 20,
    center: config.defaultCenter,
    radius: '500',
    cities: '',
    path: '',
  }
  const { users } = useUserContext()
  const router = useRouter()
  const [filter] = useQueryParam('filter', withDefault(StringParam, defaultValues.filter))
  const [order, setOrder] = useQueryParam('order', withDefault(StringParam, defaultValues.order))
  const [user, setUser] = useQueryParam('user', withDefault(StringParam, defaultValues.user))
  const [month, setMonth] = useQueryParam('month', withDefault(StringParam, defaultValues.month))
  const [year, setYear] = useQueryParam('year', withDefault(StringParam, defaultValues.year))
  const [limit, setLimit] = useQueryParam('limit', withDefault(NumberParam, defaultValues.limit))
  const searchParams = useSearchParams()

  const handleChange = {
    user: useCallback((e: React.ChangeEvent<{ value: string }>) => {
      setUser(e.target.value)
    }, [setUser]),
    month: useCallback((e: React.ChangeEvent<{ value: string }>) => {
      setMonth(e.target.value)
    }, [setMonth]),
    year: useCallback((e: React.ChangeEvent<{ value: string }>) => {
      setYear(e.target.value)
    }, [setYear]),
    order: useCallback((e: React.ChangeEvent<{ value: string }>) => {
      setOrder(e.target.value)
    }, [setOrder]),
  }
  const handleLimitCommited = useCallback((value: number) => {
    setLimit(value)
  }, [setLimit])
  const handleFilterChange = useCallback((e: React.ChangeEvent<{ value: string }>) => {
    const value = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    params.set('filter', value)
    if (value === 'hausdorff' || value === 'frechet') {
      params.set('order', 'nearest_first')
    } else if (order === 'nearest_first') {
      params.set('order', 'newest_first')
    }
    params.delete('limit')
    router.push(`/?${params.toString()}`)
  }, [searchParams.toString()])
  const sxFormInput = {
    width: '50%',
    paddingLeft: 1,
    paddingRight: 1,
    verticalAlign: 'center',
  }
  return (
    <Accordion>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="filter and sort"
        id="filter-and-sort"
      >
        <Typography color="primary" variant="overline">filter & sort</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <div>
          <TextField select label="filter" name="filter" value={filter} onChange={handleFilterChange} sx={sxFormInput} variant="standard">
            <MenuItem value="" key="default">-</MenuItem>
            <MenuItem value="neighborhood" key="neighborhood">Neighborhood</MenuItem>
            <MenuItem value="start" key="start">Start</MenuItem>
            <MenuItem value="end" key="end">End</MenuItem>
            <MenuItem value="cities" key="cities">Cities</MenuItem>
            <MenuItem value="frechet" key="frechet">Fréchet</MenuItem>
            <MenuItem value="hausdorff" key="hausdorff">Hausdorff</MenuItem>
            <MenuItem value="crossing" key="crossing">Crossing</MenuItem>
          </TextField>
          <TextField
            select
            label="user"
            name="user"
            value={user}
            onChange={handleChange.user}
            sx={sxFormInput}
            variant="standard"
          >
            <MenuItem value="" key="default">-</MenuItem>
            {
              users.map((u) => (
                <MenuItem key={u.uid}>{u.displayName}</MenuItem>
              ))
            }
          </TextField>
        </div>
        <div>
          <TextField
            select
            label="month"
            name="month"
            value={month}
            onChange={handleChange.month}
            sx={sxFormInput}
            variant="standard"
          >
            {
              monthOptions.map((option) => (
                <MenuItem
                  value={option.value}
                  key={option.value}
                >
                  {option.label}
                </MenuItem>
              ))
            }
          </TextField>
          <TextField
            select
            label="year"
            name="year"
            value={year}
            onChange={handleChange.year}
            sx={sxFormInput}
            variant="standard"
          >
            <MenuItem value="" key="default">-</MenuItem>
            {years.map((y) => <MenuItem value={y} key={y}>{y}</MenuItem>)}
          </TextField>
        </div>
        <div>
          <TextField
            select
            label="order"
            name="order"
            value={order}
            onChange={handleChange.order}
            sx={sxFormInput}
            variant="standard"
          >
            {
              (filter === 'hausdorff' || filter === 'frechet' ? orderOptionsWithNearest : orderOptions).map((option) => <MenuItem value={option.value} key={option.value}>{option.label}</MenuItem>)
            }
          </TextField>
          <NumberField
            label="limit"
            min={10}
            size="small"
            id="searchForm_limit" 
            name="limit" 
            value={limit} 
            onValueCommitted={handleLimitCommited} 
            step={10}
            sx={sxFormInput}
          />
        </div>

      </AccordionDetails>
      <AccordionActions>
        <Link href="/">
          <Button variant="outlined" color="primary">
            <RefreshIcon sx={{ marginRight: 1 }} />
              reset
          </Button>
        </Link>
      </AccordionActions>
    </Accordion>
  )
}

export default SearchForm
