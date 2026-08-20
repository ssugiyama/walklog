import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import RefreshIcon from '@mui/icons-material/Refresh'
import Accordion from '@mui/material/Accordion'
import AccordionActions from '@mui/material/AccordionActions'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from 'nuqs'
import React, { useCallback } from 'react'
import { useConfig } from '@/lib/utils/config'
import { useUserContext } from '@/lib/utils/user-context'
import NumberField from './number-field'

const filterOptionLiterals = [
  '',
  'neighborhood',
  'start',
  'end',
  'cities',
  'frechet',
  'hausdorff',
  'crossing',
]

const orderOptionLiterals = [
  'newest_first',
  'oldest_first',
  'longest_first',
  'shortest_first',
  'northernmost_first',
  'southernmost_first',
  'easternmost_first',
  'westernmost_first',
  'nearest_first',
]

const monthOptions = [
  { label: '-', value: 0 },
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

const currentYear = new Date().getFullYear()
const years: number[] = []
for (let y = currentYear; y >= 1997; y -= 1) {
  years.push(y)
}

const SearchForm = () => {
  const config = useConfig()
  const defaultValues = {
    filter: '',
    user: '',
    month: 0,
    year: 0,
    order: 'newest_first',
    limit: 20,
    center: config.defaultCenter,
    radius: '500',
    cities: '',
    path: '',
  }
  const { users } = useUserContext()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formValue, setFormValue] = useQueryStates({
    filter: parseAsStringLiteral(filterOptionLiterals).withDefault(
      defaultValues.filter,
    ),
    user: parseAsString.withDefault(defaultValues.user),
    month: parseAsInteger.withDefault(defaultValues.month),
    year: parseAsInteger.withDefault(defaultValues.year),
    order: parseAsStringLiteral(orderOptionLiterals).withDefault(
      defaultValues.order,
    ),
    limit: parseAsInteger.withDefault(defaultValues.limit),
  })
  const { filter, user, month, year, order, limit } = formValue

  const handleChange = {
    user: useCallback(
      (e: React.ChangeEvent<{ value: string }>) => {
        setFormValue({ user: e.target.value })
      },
      [setFormValue],
    ),
    month: useCallback(
      (e: React.ChangeEvent<{ value: string }>) => {
        setFormValue({ month: Number(e.target.value) })
      },
      [setFormValue],
    ),
    year: useCallback(
      (e: React.ChangeEvent<{ value: string }>) => {
        setFormValue({ year: Number(e.target.value) })
      },
      [setFormValue],
    ),
    order: useCallback(
      (e: React.ChangeEvent<{ value: string }>) => {
        setFormValue({ order: e.target.value })
      },
      [setFormValue],
    ),
  }
  const handleLimitCommited = useCallback(
    (value: number) => {
      setFormValue({ limit: value })
    },
    [setFormValue],
  )
  const handleFilterChange = useCallback(
    (e: React.ChangeEvent<{ value: string }>) => {
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
    },
    [searchParams.toString()],
  )
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
        <Typography color="primary" variant="overline">
          filter & sort
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <div>
          <TextField
            select
            label="filter"
            name="filter"
            value={filter}
            onChange={handleFilterChange}
            sx={sxFormInput}
            variant="standard"
          >
            <MenuItem value="" key="default">
              -
            </MenuItem>
            <MenuItem value="neighborhood" key="neighborhood">
              Neighborhood
            </MenuItem>
            <MenuItem value="start" key="start">
              Start
            </MenuItem>
            <MenuItem value="end" key="end">
              End
            </MenuItem>
            <MenuItem value="cities" key="cities">
              Cities
            </MenuItem>
            <MenuItem value="frechet" key="frechet">
              Fréchet
            </MenuItem>
            <MenuItem value="hausdorff" key="hausdorff">
              Hausdorff
            </MenuItem>
            <MenuItem value="crossing" key="crossing">
              Crossing
            </MenuItem>
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
            <MenuItem value="" key="default">
              -
            </MenuItem>
            {users.map((u) => (
              <MenuItem key={u.uid}>{u.displayName}</MenuItem>
            ))}
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
            {monthOptions.map((option) => (
              <MenuItem value={option.value} key={option.value}>
                {option.label}
              </MenuItem>
            ))}
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
            <MenuItem value={0} key="default">
              -
            </MenuItem>
            {years.map((y) => (
              <MenuItem value={y} key={y}>
                {y}
              </MenuItem>
            ))}
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
            {(filter === 'hausdorff' || filter === 'frechet'
              ? orderOptionsWithNearest
              : orderOptions
            ).map((option) => (
              <MenuItem value={option.value} key={option.value}>
                {option.label}
              </MenuItem>
            ))}
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
        <Button variant="outlined" color="primary" component={Link} href="/">
          <RefreshIcon sx={{ marginRight: 1 }} />
          reset
        </Button>
      </AccordionActions>
    </Accordion>
  )
}

export default SearchForm
