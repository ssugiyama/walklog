import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import '@testing-library/jest-dom'
import { Mock } from 'vite-plus/test'
import { useMainContext } from '@/lib/utils/main-context'
import { useUserContext } from '@/lib/utils/user-context'
import NavBar from './nav-bar'

vi.mock('@/lib/utils/main-context', () => ({
  useMainContext: vi.fn(),
}))

vi.mock('@/lib/utils/user-context', () => ({
  useUserContext: vi.fn(),
}))

const mockSignInSocial = vi.fn()
const mockSignOut = vi.fn()
vi.mock('@/lib/auth-client', () => ({
  authClient: {
    signIn: { social: (...args: unknown[]) => mockSignInSocial(...args) },
    signOut: (...args: unknown[]) => mockSignOut(...args),
  },
}))

vi.mock(
  '@/src/routes/editor/walk-editor',
  () =>
    function MockWalkEditor() {
      return <div data-testid="walk-editor">Walk Editor</div>
    },
)

vi.mock('@/lib/utils/navigation', async () => ({
  Link: (await import('@/lib/utils/mock-link')).MockLink,
  useSearchParams: vi.fn(() => ({
    toString: vi.fn(() => 'param1=value1&param2=value2'),
  })),
}))

vi.mock('use-query-params', () => ({
  useQueryParam: vi.fn().mockReturnValue(['']),
  StringParam: vi.fn(),
  withDefault: vi.fn(),
}))
describe('NavBar', () => {
  const mockDispatchMain = vi.fn()
  const mockPushWithGuard = vi.fn(() => vi.fn())

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useMainContext as Mock).mockReturnValue([
      { overlay: false, toolBoxOpened: false },
      mockDispatchMain,
      mockPushWithGuard,
    ])

    ;(useUserContext as Mock).mockReturnValue({
      currentUser: null,
      selfStatus: 'anonymous',
    })
  })

  it('renders the NavBar component', () => {
    render(<NavBar />)
    expect(screen.getByText('Walklog')).toBeInTheDocument()
  })

  it('opens the account menu when the account icon is clicked', () => {
    render(<NavBar />)
    const accountButton = screen.getByTestId('account-button')
    fireEvent.click(accountButton)
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('dispatches OPEN_TOOL_BOX when the menu icon is clicked', () => {
    render(<NavBar />)
    const menuButton = screen.getByRole('button', { name: /tool box/i })
    fireEvent.click(menuButton)
    expect(mockDispatchMain).toHaveBeenCalledWith({ type: 'OPEN_TOOL_BOX' })
  })

  it('displays login option when no user is logged in', () => {
    render(<NavBar />)
    fireEvent.click(screen.getByTestId('account-button'))
    expect(screen.getByText('login with Google')).toBeInTheDocument()
  })

  it('displays logout option when a user is logged in', () => {
    ;(useUserContext as Mock).mockReturnValue({
      currentUser: { displayName: 'Test User', photoURL: 'test-url' },
      selfStatus: 'active',
    })

    render(<NavBar />)
    fireEvent.click(screen.getByTestId('account-button'))
    expect(screen.getByText(/Logged in as Test User/)).toBeInTheDocument()
    expect(screen.getByText('logout')).toBeInTheDocument()
  })

  it('starts Google sign-in when "login with Google" is clicked', async () => {
    mockSignInSocial.mockResolvedValue({ error: null })
    render(<NavBar />)
    fireEvent.click(screen.getByTestId('account-button'))
    fireEvent.click(screen.getByText('login with Google'))
    await waitFor(() =>
      expect(mockSignInSocial).toHaveBeenCalledWith({
        provider: 'google',
        callbackURL: '/',
      }),
    )
  })

  it('shows the error in a snackbar when sign-in fails', async () => {
    mockSignInSocial.mockResolvedValue({ error: { message: 'boom' } })
    render(<NavBar />)
    fireEvent.click(screen.getByTestId('account-button'))
    fireEvent.click(screen.getByText('login with Google'))
    await waitFor(() =>
      expect(mockDispatchMain).toHaveBeenCalledWith({
        type: 'OPEN_SNACKBAR',
        payload: 'boom',
      }),
    )
  })

  it('signs out when "logout" is clicked', async () => {
    ;(useUserContext as Mock).mockReturnValue({
      currentUser: { displayName: 'Test User', photoURL: 'test-url' },
      selfStatus: 'active',
    })
    mockSignOut.mockResolvedValue({ error: null })
    render(<NavBar />)
    fireEvent.click(screen.getByTestId('account-button'))
    fireEvent.click(screen.getByText('logout'))
    await waitFor(() => expect(mockSignOut).toHaveBeenCalled())
  })
})
