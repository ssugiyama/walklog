'use client'
import React, {
  useState, useCallback, useMemo, useRef, useEffect,
} from 'react'
import CssBaseline from '@mui/material/CssBaseline'
import Snackbar from '@mui/material/Snackbar'
import Box from '@mui/material/Box'
import Fab from '@mui/material/Fab'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ShareIcon from '@mui/icons-material/Share'
import NavBar from '@/lib/components/nav-bar'
import ToolBox from './tool-box'
import Map from './map'
import BottomBar from './bottom-bar'
import { MapContextProvider } from '../utils/map-context'
import { useData } from '../utils/data-context'
import { ThemeProvider } from '@mui/material/styles'
import theme from '../../theme'
import NextAdapterApp from 'next-query-params/app'
import { QueryParamProvider } from 'use-query-params'
import { useMainContext } from '../utils/main-context'

const Main = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const { data } = useData()
  const current = data.current
  const headerRef = useRef(null)
  const [barHeight, setBarHeight] = useState(64)
  const TOOL_BOX_WIDTH = 160
  const [mainState, dispatchMain] = useMainContext()
  const { toolBoxOpened } = mainState
  const handleRequestClose = useCallback(() => {
    console.log('snackbar closed')
    dispatchMain({ type: 'CLOSE_SNACKBAR' })
  }, [])
  const toggleViewCB = useCallback(() => dispatchMain({ type: 'TOGGLE_VIEW' }), [])
  const shareCB = useCallback(async () => {
    try {
      const origin = window.location.origin
      const url = `${origin}${current ? '/walk/' + current.id : '/?' + window.location.search} `
      const text = document.title
      if (navigator.share) {
        await navigator.share({ url, text })
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`)
        dispatchMain({ type: 'OPEN_SNACKBAR', payload: 'copied to clipboard' })
      }
    } catch (error) {
      console.error(error)
    }
  }, [current])
  const fabStyles = useMemo(() => ({
    position: 'absolute',
    left: `calc(50% ${toolBoxOpened ? '+ 80px + env(safe-area-inset-left)/2' : ''} - 20px)`,
    margin: '0 auto',
    zIndex: 10,
    transition: 'top 0.3s, left 0.3s',
    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
    top: mainState.mode === 'map' ? `calc(100dvh - ${barHeight + 28}px - env(safe-area-inset-bottom))` : `calc(50dvh + ${barHeight / 2}px - 20px)`,
  }), [mainState.mode, toolBoxOpened, barHeight])
  const mapStyles = useMemo(() => ({
    display: 'flex',
    flexGrow: 1,
    color: '#000',
    height: mainState.mode === 'map' ? '100%' : `calc(50dvh - ${barHeight / 2}px)`,
  }), [mainState.mode])
  const shareButtonStyles = useMemo(() => ({
    position: 'fixed',
    right: 16,
    bottom: mainState.mode === 'map' ? 'calc(56px + env(safe-area-inset-bottom))' : 16,
    transition: 'bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.1s',
    display: 'inline-flex',
  }), [mainState.mode])
  const toolBoxStyles = useMemo(() => ({
    '& .MuiDrawer-paper': {
      width: `calc(${TOOL_BOX_WIDTH}px + env(safe-area-inset-left))`,
      paddingLeft: 'env(safe-area-inset-left)',
    },
  }), [])
  useEffect(() => {
    setBarHeight(headerRef.current && headerRef.current.offsetHeight)
  }, [headerRef.current && headerRef.current.offsetHeight])

  return (
    <Box
      sx={{
        height: '100%',
      }}
    >
      <QueryParamProvider adapter={NextAdapterApp}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <MapContextProvider>
            <ToolBox
              open={toolBoxOpened}
              sx={toolBoxStyles}
            />
            <Box
              component="main"
              style={{
                height: '100%',
                flexDirection: 'column',
                display: mainState.mode === 'map' ? 'flex' : 'block',
                marginLeft: toolBoxOpened ? `calc(${TOOL_BOX_WIDTH}px + env(safe-area-inset-left))` : 0,
                transition: 'margin 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <NavBar
                ref={headerRef}
                sx={{ pt: 'env(safe-area-inset-top)' }}
              />
              <Map
                style={mapStyles}
              />
              <Box style={{
                display: mainState.mode === 'map' ? 'none' : 'block',
                paddingLeft: toolBoxOpened ? 8 : 'calc(env(safe-area-inset-left) + 8px)',
                paddingRight: 'calc(env(safe-area-inset-right) + 8px)',
              }}>
                <Box paddingBottom={5} mx="auto">
                  {children}
                </Box>
              </Box>
              <Fab
                size="small"
                aria-label="toggle view"
                color="secondary"
                onClick={toggleViewCB}
                sx={fabStyles}
              >
                {mainState.mode === 'content' ? <ExpandMoreIcon /> : <ExpandLessIcon />}
              </Fab>
              <Box sx={{
                display: mainState.mode === 'map' ? 'flex' : 'none',
                pb: 'env(safe-area-inset-bottom)',
              }}
              >
                <BottomBar />
              </Box>
            </Box>
            <Fab
              size="small"
              aria-label="share"
              color="default"
              onClick={shareCB}
              sx={shareButtonStyles}
              disabled={!!current?.draft}
            >
              <ShareIcon />
            </Fab>
            <Snackbar
              open={mainState.message !== null}
              message={mainState.message}
              autoHideDuration={4000}
              onClose={handleRequestClose}
            />
          </MapContextProvider>
        </ThemeProvider>
      </QueryParamProvider>
    </Box>
  )
}

export default Main
