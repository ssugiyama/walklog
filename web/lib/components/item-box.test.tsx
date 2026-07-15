import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import ItemBox from './item-box'
import { useData } from '../utils/data-context'
import { useUserContext } from '../utils/user-context'
import { useSearchParams } from 'next/navigation'
import { useConfig } from '../utils/config'
import { useRouter } from 'next/navigation'
import { useMainContext } from '../utils/main-context'

vi.mock('@/app/lib/walk-actions', () => ({
  deleteItemAction: vi.fn(),
}))

vi.mock('@/lib/components/walk-editor', () => function MockWalkEditor() {
  return <div data-testid="walk-editor">Walk Editor</div>
})

vi.mock('../utils/data-context', () => ({
  useData: vi.fn(),
}))

vi.mock('./elevation-box', () => function MockElevationBox() {
  return <div data-testid="elevation-box">Elevation Box</div>
})

vi.mock('./panorama-box', () => function MockPanoramaBox() {
  return <div data-testid="panorama-box">Panorama Box</div>
})

vi.mock('../utils/user-context', () => ({
  useUserContext: vi.fn(),
}))

vi.mock('../utils/main-context', () => ({
  useMainContext: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
  useRouter: vi.fn(),
}))

vi.mock('../utils/config', () => ({
  useConfig: vi.fn(),
}))

describe('ItemBox Component', () => {
  const mockRouterPush = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks();
    (useData as vi.Mock).mockReturnValue([
      {
        current: null,
        isPending: false,
        error: null,
        nextId: null,
        prevId: null,
        offset: 0,
      },
    ]);
    (useUserContext as vi.Mock).mockReturnValue({
      users: [],
      currentUser: null,
    });
    (useMainContext as vi.Mock).mockReturnValue([
      {
        overlay: false,
        PanoramaIndex: 0,
        paroramaCount: 100,
      },
      vi.fn(), // setOverlay
    ]);
    (useSearchParams as vi.Mock).mockReturnValue(new URLSearchParams());
    (useConfig as vi.Mock).mockReturnValue({});
    (useRouter as vi.Mock).mockReturnValue({ push: mockRouterPush })
  })

  it('renders loading state when data is pending', () => {
    (useData as vi.Mock).mockReturnValue([
      { isPending: true },
    ])

    const { container} = render(<ItemBox />)
    expect(container.firstChild).toBeNull()
  })

  it('renders error state when there is an error', () => {
    (useData as vi.Mock).mockReturnValue([
      { error: 'Test error' },
    ])

    const { container} = render(<ItemBox />)
    expect(container.firstChild).toBeNull()
  })

  it('renders item details when data is available', () => {
    (useData as vi.Mock).mockReturnValue([
      {
        current: {
          date: '2023-01-01',
          title: 'Test Walk',
          length: 5.5,
          comment: 'Test comment',
          image: 'test-image.jpg',
          uid: 'user1',
        },
        isPending: false,
        error: null,
      },
    ]);
    (useUserContext as vi.Mock).mockReturnValue({
      users: [{ uid: 'user1', displayName: 'Test User', photoURL: 'test-photo.jpg' }],
      currentUser: { uid: 'user1' },
    })

    render(<ItemBox />)
    expect(screen.getByText('2023-01-01 : Test Walk (5.5 km)')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByTestId('item-image')).toHaveAttribute('src', 'test-image.jpg')
  })

  it('calls handleEdit when edit button is clicked', () => {
    (useData as vi.Mock).mockReturnValue([
      {
        current: { uid: 'user1', length: 9.9 },
        isPending: false,
        error: null,
      },
    ]);
    (useUserContext as vi.Mock).mockReturnValue({
      users: [{ uid: 'user1', displayName: 'Test User', photoURL: 'test-photo.jpg' }],
      currentUser: { uid: 'user1' },
    })

    try {
      render(<ItemBox />)
    } catch (error) {
      console.error('Error rendering ItemBox:', error)
    }
    const editButton = screen.getByTestId('edit-button')
    fireEvent.click(editButton)
    expect(screen.getByTestId('ItemBox')).toBeInTheDocument()
  })

  it('calls handleDelete when delete button is clicked', () => {
    window.confirm = vi.fn(() => true);
    (useData as vi.Mock).mockReturnValue([
      {
        current: { id: 'item1', uid: 'user1', length: 9.9 },
        isPending: false,
        error: null,
      },
    ]);
    (useUserContext as vi.Mock).mockReturnValue({
      users: [{ uid: 'user1', displayName: 'Test User', photoURL: 'test-photo.jpg' }],
      currentUser: { uid: 'user1' },
    })

    render(<ItemBox />)
    const deleteButton = screen.getByTestId('delete-button')
    fireEvent.click(deleteButton)
    expect(window.confirm).toHaveBeenCalledWith('Are you sure to delete?')
  })
})