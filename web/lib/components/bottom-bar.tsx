import React, { useCallback } from 'react'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import NavigationRefresh from '@mui/icons-material/Block'
import NavigationCancel from '@mui/icons-material/Cancel'
import NavigationArrowForward from '@mui/icons-material/ArrowForward'
import NavigationArrowBack from '@mui/icons-material/ArrowBack'
import AvFastForward from '@mui/icons-material/FastForward'
import AvFastRewind from '@mui/icons-material/FastRewind'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Link from 'next/link'
import { idToUrl } from '../utils/meta-utils'
import { useData } from '../utils/data-context'
import { useSearchParams, usePathname } from 'next/navigation'
import { useConfig } from '../utils/config'
import { useQueryParam, StringParam, withDefault, NumberParam } from 'use-query-params'
import { useMainContext } from '../utils/main-context'

const BottomBar = (props) => {
  const config = useConfig()
  const [mainState, dispatchMain] = useMainContext()
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
  const [filter, setFilter] = useQueryParam('filter', withDefault(StringParam, defaultValues.filter))
  const [radius, setRadius] = useQueryParam('radius', withDefault(NumberParam, config.defaultRadius))
  const [, setCities] = useQueryParam('cities', withDefault(StringParam, defaultValues.cities))
  const { overlay, panoramaIndex, panoramaCount } = mainState
  const searchParams = useSearchParams()
  const [data] = useData()
  const pathname = usePathname()
  const match = pathname.match(/\/walk\/(\d+)/)
  const id = match ? Number(match[1]) : null
  const index = data.rows.findIndex((row) => row.id === Number(id))
  const item = data.current
  const prevId = index > 0 ? data.rows[index - 1].id : null
  const nextId = index < data.rows.length - 1 ? data.rows[index + 1].id : null
  const createPanoramaIndexButtonClickCB = (d: number) => () => (
    console.log('createPanoramaIndexButtonClickCB', d, panoramaIndex),
    dispatchMain({ type: 'SET_PANORAMA_INDEX', payload: panoramaIndex + d })
  )
  const panoramaIndexButtonClickCBs = {
    '-10': useCallback(createPanoramaIndexButtonClickCB(-10), [panoramaIndex]),
    '-1': useCallback(createPanoramaIndexButtonClickCB(-1), [panoramaIndex]),
    '+1': useCallback(createPanoramaIndexButtonClickCB(1), [panoramaIndex]),
    '+10': useCallback(createPanoramaIndexButtonClickCB(10), [panoramaIndex]),
  }
  const overlayButtonClickCB = useCallback(() => dispatchMain({ type: 'SET_OVERLAY', payload: false }), [])
  const sxBottomBarGroup = {
    width: '100%',
    margin: 'auto',
  }
  const sxBottomBarGroupBody = {
    width: '100%',
    margin: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
  const OverlayControls = (
    <div key="overlay">
      <Box sx={sxBottomBarGroupBody}>
        <Tooltip title="back to map" placement="top">
          <IconButton data-testid="back-to-map-button" onClick={overlayButtonClickCB} size="large"><NavigationCancel /></IconButton>
        </Tooltip>
        <Tooltip title="-10" placement="top">
          <IconButton data-testid="backward-panorama-index-by-10-button" onClick={panoramaIndexButtonClickCBs['-10']} size="large"><AvFastRewind /></IconButton>
        </Tooltip>
        <Tooltip title="-1" placement="top">
          <IconButton data-testid="backward-panorama-index-by-1-button" onClick={panoramaIndexButtonClickCBs['-1']} size="large"><NavigationArrowBack /></IconButton>
        </Tooltip>
        <Typography variant="body1" sx={{ display: 'inline' }}>
          {panoramaIndex + 1}
          {' '}
          /
          {' '}
          {panoramaCount}
          {' '}
        </Typography>
        <Tooltip title="+1" placement="top">
          <IconButton data-testid="forward-panorama-index-by-1-button" onClick={panoramaIndexButtonClickCBs['+1']} size="large"><NavigationArrowForward /></IconButton>
        </Tooltip>
        <Tooltip title="+10" placement="top">
          <IconButton data-testid="forward-panorama-index-by-10-button" onClick={panoramaIndexButtonClickCBs['+10']} size="large"><AvFastForward /></IconButton>
        </Tooltip>
      </Box>
    </div>
  )

  const searchFormChangeCBs = {
    filter: useCallback((e) => setFilter(e.target.value), []),
    radius: useCallback((e) => setRadius(e.target.value), []),
    cities: useCallback(() => setCities(''), []),
  }
  const FilterControls = (
    <div key="filter">
      <Box sx={sxBottomBarGroupBody}>
        <Select data-testid="filter-select" value={filter} onChange={searchFormChangeCBs.filter} variant="standard">
          <MenuItem value="">-</MenuItem>
          <MenuItem value="neighborhood">Neighborhood</MenuItem>
          <MenuItem value="start">Start</MenuItem>
          <MenuItem value="end">End</MenuItem>
          <MenuItem value="cities">Cities</MenuItem>
          <MenuItem value="frechet">Fréchet</MenuItem>
          <MenuItem value="hausdorff">Hausdorff</MenuItem>
          <MenuItem value="crossing">Crossing</MenuItem>
        </Select>
        {['neighborhood', 'start', 'end'].includes(filter) &&
          (
            <Select value={radius} onChange={searchFormChangeCBs.radius} variant="standard">
              <MenuItem value={1000}>1km</MenuItem>
              <MenuItem value={500}>500m</MenuItem>
              <MenuItem value={250}>250m</MenuItem>
              <MenuItem value={100}>100m</MenuItem>
              {
                [1000, 500, 250, 100].some((r) => r === radius) ? null :
                  (<MenuItem value={radius}>{`${Math.round(radius)}m`}</MenuItem>)
              }
            </Select>
          )}
        {filter === 'cities' &&
          (
            <Tooltip title="clear" placement="top">
              <IconButton onClick={searchFormChangeCBs.cities} size="large"><NavigationRefresh /></IconButton>
            </Tooltip>
          )}
      </Box>
    </div>
  )

  const title = item && `${item.date} : ${item.title} (${item.length.toFixed(1)} km)`
  let nextUrl = nextId && idToUrl(nextId, searchParams)
  if (!nextUrl && data.offset > 0) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('limit', (Number(data.offset) + 20).toString())
    nextUrl = `/?${params.toString()}&index=${data.offset}`
  }
  const prevUrl = prevId && idToUrl(prevId, searchParams)

  const ItemControls = (
    <div key="item">
      <Box sx={sxBottomBarGroupBody}>
        <Tooltip title="prev" placement="top">
          <IconButton data-testid="prev-button" disabled={!prevUrl} component={Link} href={prevUrl || ''} size="large"><NavigationArrowBack /></IconButton>
        </Tooltip>
        <Typography variant="body1" sx={{ display: 'inline', flexShrink: 1 }} noWrap>{title}</Typography>
        <Tooltip title="next" placement="top">
          <IconButton data-testid="next-button" disabled={!nextUrl} component={Link} href={nextUrl || ''} size="large"><NavigationArrowForward /></IconButton>
        </Tooltip>
      </Box>
    </div>
  )
  const control = overlay ? OverlayControls : item ? ItemControls : FilterControls
  return (
    <Toolbar sx={{ width: '100%', backgroundColor: 'background.paper' }} data-testid="BottomBar" {...props}>
      <Box sx={sxBottomBarGroup}>
        {control}
      </Box>
    </Toolbar>
  )
}

export default BottomBar
