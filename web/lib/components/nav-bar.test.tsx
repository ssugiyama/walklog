import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import NavBar from './nav-bar'
import { useMainContext } from '../utils/main-context'
import { useUserContext } from '../utils/user-context'
import { useConfig } from '../utils/config'
import { Mock } from 'vitest'

vi.mock('../utils/main-context', () => ({
  useMainContext: vi.fn(),
}))

vi.mock('../utils/user-context', () => ({
  useUserContext: vi.fn(),
}))

vi.mock('../utils/config', () => ({
  useConfig: vi.fn(),
}))

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}))

vi.mock('@/lib/components/walk-editor', () => function MockWalkEditor() {
  return <div data-testid="walk-editor">Walk Editor</div>
})

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
}))

vi.mock('next/navigation', () => ({
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
  const mockSetCurrentUser = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks();

    (useMainContext as Mock).mockReturnValue([
      { overlay: false, toolBoxOpened: false },
      mockDispatchMain,
      mockPushWithGuard,
    ]);

    (useUserContext as Mock).mockReturnValue({
      currentUser: null,
      setCurrentUser: mockSetCurrentUser,
    });

    (useConfig as Mock).mockReturnValue({
      firebaseConfig: {},
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
    (useUserContext as Mock).mockReturnValue({
      currentUser: { displayName: 'Test User', photoURL: 'test-url' },
      setCurrentUser: mockSetCurrentUser,
    })

    render(<NavBar />)
    fireEvent.click(screen.getByTestId('account-button'))
    expect(screen.getByText(/Logged in as Test User/)).toBeInTheDocument()
    expect(screen.getByText('logout')).toBeInTheDocument()
  })
})
