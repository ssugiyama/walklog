import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import NavBar from './nav-bar'
import { useMainContext } from '../utils/main-context'
import { useUserContext } from '../utils/user-context'
import { useConfig } from '../utils/config'

jest.mock('../utils/main-context', () => ({
  useMainContext: jest.fn(),
}))

jest.mock('../utils/user-context', () => ({
  useUserContext: jest.fn(),
}))

jest.mock('../utils/config', () => ({
  useConfig: jest.fn(),
}))

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
}))

jest.mock('@/lib/components/walk-editor', () => function MockWalkEditor() {
  return <div data-testid="walk-editor">Walk Editor</div>
})

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(() => ({
    toString: jest.fn(() => 'param1=value1&param2=value2')
  })),
}))

jest.mock('use-query-params', () => ({
  useQueryParam: jest.fn().mockReturnValue(['']),
  StringParam: jest.fn(),
  withDefault: jest.fn(),
}))
describe('NavBar', () => {
  const mockDispatchMain = jest.fn()
  const mockPushWithGuard = jest.fn(() => jest.fn())
  const mockSetCurrentUser = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks();

    (useMainContext as jest.Mock).mockReturnValue([
      { overlay: false, toolBoxOpened: false },
      mockDispatchMain,
      mockPushWithGuard,
    ]);

    (useUserContext as jest.Mock).mockReturnValue({
      currentUser: null,
      setCurrentUser: mockSetCurrentUser,
    });

    (useConfig as jest.Mock).mockReturnValue({
      appVersion: '1.0.0',
      firebaseConfig: {},
    })
  })

  it('renders the NavBar component', () => {
    render(<NavBar />)
    expect(screen.getByText('Walklog')).toBeInTheDocument()
    expect(screen.getByText('v1.0.0')).toBeInTheDocument()
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

  it('displays logout option when a user is logged in', async () => {
    (useUserContext as jest.Mock).mockReturnValue({
      currentUser: { displayName: 'Test User', photoURL: 'test-url' },
      setCurrentUser: mockSetCurrentUser,
    })

    render(<NavBar />)
    fireEvent.click(screen.getByTestId('account-button'))
    expect(screen.getByText(/Logged in as Test User/)).toBeInTheDocument()
    expect(screen.getByText('logout')).toBeInTheDocument()
  })
})
