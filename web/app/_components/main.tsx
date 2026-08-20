'use client'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ShareIcon from '@mui/icons-material/Share'
import Box from '@mui/material/Box'
import CssBaseline from '@mui/material/CssBaseline'
import Fab from '@mui/material/Fab'
import Snackbar from '@mui/material/Snackbar'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useConfig } from '@/lib/utils/config'
import { useData } from '@/lib/utils/data-context'
import { useMainContext } from '@/lib/utils/main-context'
import { MapContextProvider } from '@/lib/utils/map-context'
import { idToShowUrl } from '@/lib/utils/meta-utils'
import BottomBar from './bottom-bar'
import GMap from './map'
import NavBar from './nav-bar'
import ToolBox from './tool-box'

const Main = ({ children }: { children: React.ReactNode }) => {
  const [data] = useData()
  const current = data.current
  const headerRef = useRef<HTMLDivElement | null>(null)
  const [barHeight, setBarHeight] = useState<number>(64)
  const TOOL_BOX_WIDTH = 160
  const [mainState, dispatchMain] = useMainContext()
  const { toolBoxOpened } = mainState
  const handleRequestClose = useCallback(() => {
    dispatchMain({ type: 'CLOSE_SNACKBAR' })
  }, [])
  const config = useConfig()
  const theme = useMemo(() => createTheme(config.theme), [config.theme])
  const toggleViewCB = useCallback(
    () => dispatchMain({ type: 'TOGGLE_VIEW' }),
    [],
  )
  const shareCB = useCallback((): void => {
    void (async () => {
      try {
        const origin = window.location.origin
        const url =
          origin +
          (current ? idToShowUrl(current.id) : '/?' + window.location.search)
        const text = document.title
        if (navigator.share) {
          await navigator.share({ url, text })
        } else {
          await navigator.clipboard.writeText(`${text} ${url}`)
          dispatchMain({
            type: 'OPEN_SNACKBAR',
            payload: 'copied to clipboard',
          })
        }
      } catch (error) {
        console.error(error)
      }
    })()
  }, [current])
  const fabStyles = useMemo(
    () => ({
      position: 'absolute',
      left: `calc(50% ${toolBoxOpened ? '+ 80px + env(safe-area-inset-left)/2' : ''} - 20px)`,
      margin: '0 auto',
      zIndex: 10,
      transition: 'top 0.3s, left 0.3s',
      transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
      top:
        mainState.mode === 'map'
          ? `calc(100dvh - ${barHeight + 28}px - env(safe-area-inset-bottom))`
          : `calc(50dvh + ${barHeight / 2}px - 20px)`,
    }),
    [mainState.mode, toolBoxOpened, barHeight],
  )
  const mapStyles = useMemo(
    () => ({
      display: 'flex',
      flexGrow: 1,
      color: '#000',
      height:
        mainState.mode === 'map' ? '100%' : `calc(50dvh - ${barHeight / 2}px)`,
    }),
    [mainState.mode],
  )
  const shareButtonStyles = useMemo(
    () => ({
      position: 'fixed',
      right: 16,
      bottom:
        mainState.mode === 'map'
          ? 'calc(56px + env(safe-area-inset-bottom))'
          : 16,
      transition: 'bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.1s',
      display: 'inline-flex',
    }),
    [mainState.mode],
  )
  const toolBoxStyles = useMemo(
    () => ({
      '& .MuiDrawer-paper': {
        width: `calc(${TOOL_BOX_WIDTH}px + env(safe-area-inset-left))`,
        paddingLeft: 'env(safe-area-inset-left)',
      },
    }),
    [],
  )
  useEffect(() => {
    setBarHeight(headerRef.current?.offsetHeight)
  }, [headerRef.current?.offsetHeight])

  return (
    <Box
      sx={{
        height: '100%',
      }}
    >
      <NuqsAdapter>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <MapContextProvider>
            <ToolBox open={toolBoxOpened} sx={toolBoxStyles} />
            <Box
              component="main"
              style={{
                height: '100%',
                flexDirection: 'column',
                display: mainState.mode === 'map' ? 'flex' : 'block',
                marginLeft: toolBoxOpened
                  ? `calc(${TOOL_BOX_WIDTH}px + env(safe-area-inset-left))`
                  : 0,
                transition: 'margin 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <NavBar ref={headerRef} sx={{ pt: 'env(safe-area-inset-top)' }} />
              <GMap style={mapStyles} />
              <Box
                style={{
                  display: mainState.mode === 'map' ? 'none' : 'block',
                  paddingLeft: toolBoxOpened
                    ? 8
                    : 'calc(env(safe-area-inset-left) + 8px)',
                  paddingRight: 'calc(env(safe-area-inset-right) + 8px)',
                }}
              >
                <Box sx={{ paddingBottom: 5, mx: 'auto' }}>{children}</Box>
              </Box>
              <Fab
                size="small"
                aria-label="toggle view"
                color="secondary"
                onClick={toggleViewCB}
                sx={fabStyles}
              >
                {mainState.mode === 'content' ? (
                  <ExpandMoreIcon />
                ) : (
                  <ExpandLessIcon />
                )}
              </Fab>
              <Box
                sx={{
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
      </NuqsAdapter>
    </Box>
  )
}

export default Main
