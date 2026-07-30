import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import MenuIcon from '@mui/icons-material/Menu'
import { IconButton } from '@mui/material'
import AppBar from '@mui/material/AppBar'
import Divider from '@mui/material/Divider'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  getAuth,
  onIdTokenChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useConfig } from '@/lib/utils/config'
import { useMainContext } from '@/lib/utils/main-context'
import { useUserContext } from '@/lib/utils/user-context'

const NavBar = (props: React.ComponentProps<typeof AppBar>) => {
  const searchParams = useSearchParams()
  const [mainState, dispatchMain, interceptLink] = useMainContext()
  const { overlay } = mainState
  const config = useConfig()
  const provider = useRef<GoogleAuthProvider | null>(null)
  const [accountAnchorEl, setAccountAnchorEl] = useState<HTMLElement | null>(
    null,
  )
  const { currentUser, setCurrentUser, selfStatus, updateIdToken } =
    useUserContext()
  const canPost = selfStatus === 'active'
  const handleMenuOpen =
    (setter: typeof setAccountAnchorEl) =>
    (event: React.MouseEvent<HTMLElement>) => {
      event.stopPropagation()
      setter(event.currentTarget)
    }
  const accountMenuOpenCB = useCallback(handleMenuOpen(setAccountAnchorEl), [])
  const handleMenuClose =
    (setter: typeof setAccountAnchorEl) =>
    (event: React.MouseEvent<HTMLElement>) => {
      event.stopPropagation()
      setter(null)
    }
  const accountMenuCloseCB = useCallback(
    handleMenuClose(setAccountAnchorEl),
    [],
  )

  const handleLogin = useCallback((_ev: React.MouseEvent<HTMLLIElement>) => {
    signInWithPopup(getAuth(), provider.current).catch((error: Error) => {
      dispatchMain({ type: 'OPEN_SNACKBAR', payload: error.message })
    })
  }, [])
  const handleLogout = useCallback((_ev: React.MouseEvent<HTMLLIElement>) => {
    signOut(getAuth()).catch((error: Error) => {
      dispatchMain({ type: 'OPEN_SNACKBAR', payload: error.message })
    })
  }, [])
  useEffect(() => {
    if (!config.firebaseConfig) return

    initializeApp(config.firebaseConfig)
    provider.current = new GoogleAuthProvider()
    // onIdTokenChanged (rather than onAuthStateChanged) also fires on
    // Firebase's own silent background token refresh, not just sign-in/out,
    // so the httpOnly session cookie gets renewed proactively instead of
    // waiting for a request to fail with an expired token first.
    return onIdTokenChanged(getAuth(), (user) => {
      setCurrentUser(user)
      void updateIdToken()
    })
  }, [config.firebaseConfig, updateIdToken])
  const closeAllMenus = () => {
    setAccountAnchorEl(null)
  }
  const EndMenuItem = useCallback(
    (
      prps: React.ComponentProps<typeof MenuItem> & {
        component?: typeof Link
        href?: string
      },
    ) => {
      const { onClick, children } = prps
      const cpProps = { ...prps }
      delete cpProps.onClick
      return (
        <MenuItem
          onClick={(ev) => {
            closeAllMenus()
            if (onClick) onClick(ev)
            return true
          }}
          {...cpProps}
        >
          {children}
        </MenuItem>
      )
    },
    [],
  )

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
        <Typography
          variant="h5"
          component="a"
          color="inherit"
          sx={{ flex: 1, cursor: 'pointer' }}
          onClick={() => {
            window.location.href = '/'
          }}
        >
          Walklog
        </Typography>
        <IconButton
          onClick={accountMenuOpenCB}
          color="inherit"
          size="large"
          data-testid="account-button"
        >
          {currentUser ? (
            <img
              alt="user profile"
              style={{ width: 24, borderRadius: '50%' }}
              src={currentUser.photoURL}
            />
          ) : (
            <AccountCircleIcon />
          )}
        </IconButton>
      </Toolbar>
      <Menu
        anchorEl={accountAnchorEl}
        open={Boolean(accountAnchorEl)}
        onClose={accountMenuCloseCB}
      >
        {currentUser
          ? [
              <MenuItem key="label" disabled>
                Logged in as {currentUser.displayName}
              </MenuItem>,
              selfStatus === 'pending' ? (
                <MenuItem key="pending" disabled>
                  pending approval...
                </MenuItem>
              ) : null,
              <Divider key="divider" />,
              canPost ? (
                <EndMenuItem
                  key="new walk"
                  component={Link}
                  href={`/new?${searchParams.toString()}`}
                  onClick={interceptLink}
                >
                  new walk...
                </EndMenuItem>
              ) : null,
              <EndMenuItem key="logout" onClick={handleLogout}>
                logout
              </EndMenuItem>,
            ].filter(Boolean)
          : [
              <EndMenuItem key="login" onClick={handleLogin}>
                login with Google
              </EndMenuItem>,
            ]}
      </Menu>
    </AppBar>
  )
}

export default NavBar
