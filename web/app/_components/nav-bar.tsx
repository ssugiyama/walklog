import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import MenuIcon from '@mui/icons-material/Menu'
import { IconButton } from '@mui/material'
import AppBar from '@mui/material/AppBar'
import Divider from '@mui/material/Divider'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import React, { useCallback, useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { useMainContext } from '@/lib/utils/main-context'
import { useUserContext } from '@/lib/utils/user-context'

const NavBar = (props: React.ComponentProps<typeof AppBar>) => {
  const searchParams = useSearchParams()
  const [mainState, dispatchMain, interceptLink] = useMainContext()
  const { overlay } = mainState
  const [accountAnchorEl, setAccountAnchorEl] = useState<HTMLElement | null>(
    null,
  )
  const { currentUser, selfStatus } = useUserContext()
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

  const handleLogin = useCallback(
    async (_ev: React.MouseEvent<HTMLLIElement>) => {
      const { error } = await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/',
      })
      if (error) {
        dispatchMain({ type: 'OPEN_SNACKBAR', payload: error.message })
      }
    },
    [],
  )
  const handleLogout = useCallback(
    async (_ev: React.MouseEvent<HTMLLIElement>) => {
      const { error } = await authClient.signOut()
      if (error) {
        dispatchMain({ type: 'OPEN_SNACKBAR', payload: error.message })
      }
    },
    [],
  )
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
              // Google's avatar host answers 429 to requests that carry a
              // referrer (e.g. from localhost), so don't send one.
              referrerPolicy="no-referrer"
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
