import React, {
  useEffect, useState, useCallback, useRef, useMemo,
} from 'react'
import { useQueryParam, StringParam, withDefault } from 'use-query-params'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import moment from 'moment'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import Button from '@mui/material/Button'
import MenuIcon from '@mui/icons-material/Menu'
import { useConfig } from '../utils/config'
import { useUserContext } from '../utils/user-context'
import {
  initializeApp,
} from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { useMainContext } from '../utils/main-context'
import { useSearchParams } from 'next/navigation'
import { Link } from '@mui/material'
const NavBar = (props) => {
  const searchParams = useSearchParams()
  const [mainState, dispatchMain] = useMainContext()
  const { overlay } = mainState
  const config = useConfig()
  const provider = useRef(null)
  const [accountAnchorEl, setAccountAnchorEl] = useState(null)
  const [searchPath] = useQueryParam('path', withDefault(StringParam, ''))
  const { currentUser, setCurrentUser } = useUserContext()
  const appVersion = `v${config.appVersion}`
  const handleMenuOpen = (setter) => (event) => {
    event.stopPropagation()
    setter(event.currentTarget)
  }
  const accountMenuOpenCB = useCallback(handleMenuOpen(setAccountAnchorEl), [])
  const handleMenuClose = (setter) => (event) => {
    event.stopPropagation()
    setter(null)
  }
  const accountMenuCloseCB = useCallback(handleMenuClose(setAccountAnchorEl), [])

  const handleLogin = useCallback(() => {
    signInWithPopup(getAuth(), provider.current).catch((error) => {
      dispatchMain({ type: 'OPEN_SNACKBAR', payload: error.message })
    })
  }, [])
  const handleLogout = useCallback(() => {
    signOut(getAuth()).catch((error) => {
      dispatchMain({ type: 'OPEN_SNACKBAR', payload: error.message })
    })
  }, [])
  useEffect(() => {
    if (!config.firebaseConfig) return

    initializeApp(config.firebaseConfig)
    provider.current = new GoogleAuthProvider()
    onAuthStateChanged(getAuth(), (user) => {
      setCurrentUser(user)
    })
  }, [config.firebaseConfig])
  const closeAllMenus = () => {
    setAccountAnchorEl(null)
  }
  const EndMenuItem = useCallback((prps) => {
    const { onClick, children } = prps
    const cpProps = { ...prps }
    delete cpProps.onClick
    return (
      <MenuItem
        onClick={() => {
          closeAllMenus()
          if (onClick) onClick()
          return true
        }}
        {...cpProps}
      >
        {children}
      </MenuItem>
    )
  }, [])

  const today = moment().format('YYYY-MM-DD')
  return (
    <AppBar position="static" enableColorOnDark {...props}>
      <Toolbar>
        <IconButton
          onClick={() => dispatchMain({ type: 'OPEN_TOOL_BOX' })}
          size="large"
          edge="start"
          color="inherit"
          aria-label="tool box"
          sx={{ mr: 2 }}
          disabled={overlay}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h5" component="a" color="inherit" sx={{ flex: 1, cursor: 'pointer' }} onClick={() => { window.location.href = '/' }}>Walklog</Typography>
        <IconButton onClick={accountMenuOpenCB} color="inherit" size="large" data-testid="account-button">
          {currentUser ? <img alt="user profile" style={{ width: 24, borderRadius: '50%' }} src={currentUser.photoURL} /> : <AccountCircleIcon />}
        </IconButton>
        <Button component="a" href="https://github.com/ssugiyama/walklog" target="_blank" color="inherit" sx={{ textTransform: 'none' }}>{appVersion}</Button>
      </Toolbar>
      <Menu
        anchorEl={accountAnchorEl}
        open={Boolean(accountAnchorEl)}
        onClose={accountMenuCloseCB}
      >
        {
          currentUser ? [
            (
              <MenuItem key="label" disabled>
                Logged in as {currentUser.displayName}
              </MenuItem>
            ),
            (<Divider key="divider" />),
            (<EndMenuItem key="new walk" component={Link} href={`/new?${searchParams.toString()}`}>new walk...</EndMenuItem>),
            (<EndMenuItem key="logout" onClick={handleLogout}>logout</EndMenuItem>),
          ] : [<EndMenuItem key="login" onClick={handleLogin}>login with Google</EndMenuItem>]
        }
      </Menu>
    </AppBar>
  )
}

export default NavBar
