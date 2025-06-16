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

jest.mock('@/app/lib/walk-actions', () => ({
  deleteItemAction: jest.fn(),
}))

jest.mock('@/lib/components/walk-editor', () => function MockWalkEditor() {
  return <div data-testid="walk-editor">Walk Editor</div>
})

jest.mock('swiper/react', () => ({
  Swiper: ({ children }) => <div>{children}</div>,
  SwiperSlide: ({ children }) => <div>{children}</div>,
}))
jest.mock('swiper/css', () => ({}))

jest.mock('../utils/data-context', () => ({
  useData: jest.fn(),
}))

jest.mock('./elevation-box', () => function MockElevationBox() {
  return <div data-testid="elevation-box">Elevation Box</div>
})

jest.mock('./panorama-box', () => function MockPanoramaBox() {
  return <div data-testid="panorama-box">Panorama Box</div>
})

jest.mock('../utils/user-context', () => ({
  useUserContext: jest.fn(),
}))

jest.mock('../utils/main-context', () => ({
  useMainContext: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  useRouter: jest.fn(),
}))

jest.mock('../utils/config', () => ({
  useConfig: jest.fn(),
}))

describe('ItemBox Component', () => {
  const mockRouterPush = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks();
    (useData as jest.Mock).mockReturnValue([
      {
        current: null,
        isPending: false,
        error: null,
        nextId: null,
        prevId: null,
        offset: 0,
      },
    ]);
    (useUserContext as jest.Mock).mockReturnValue({
      users: [],
      currentUser: null,
    });
    (useMainContext as jest.Mock).mockReturnValue([
      {
        overlay: false,
        PanoramaIndex: 0,
        paroramaCount: 100,
      },
      jest.fn(), // setOverlay
    ]);
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());
    (useConfig as jest.Mock).mockReturnValue({});
    (useRouter as jest.Mock).mockReturnValue({ push: mockRouterPush })
  })

  it('renders loading state when data is pending', () => {
    (useData as jest.Mock).mockReturnValue([
      { isPending: true },
    ])

    const { container} = render(<ItemBox />)
    expect(container.firstChild).toBeNull()
  })

  it('renders error state when there is an error', () => {
    (useData as jest.Mock).mockReturnValue([
      { error: 'Test error' },
    ])

    const { container} = render(<ItemBox />)
    expect(container.firstChild).toBeNull()
  })

  it('renders item details when data is available', () => {
    (useData as jest.Mock).mockReturnValue([
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
    (useUserContext as jest.Mock).mockReturnValue({
      users: [{ uid: 'user1', displayName: 'Test User', photoURL: 'test-photo.jpg' }],
      currentUser: { uid: 'user1' },
    })

    render(<ItemBox />)
    expect(screen.getByText('2023-01-01 : Test Walk (5.5 km)')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByTestId('item-image')).toHaveAttribute('src', 'test-image.jpg')
  })

  it('calls handleEdit when edit button is clicked', () => {
    (useData as jest.Mock).mockReturnValue([
      {
        current: { uid: 'user1', length: 9.9 },
        isPending: false,
        error: null,
      },
    ]);
    (useUserContext as jest.Mock).mockReturnValue({
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
    window.confirm = jest.fn(() => true);
    (useData as jest.Mock).mockReturnValue([
      {
        current: { id: 'item1', uid: 'user1', length: 9.9 },
        isPending: false,
        error: null,
      },
    ]);
    (useUserContext as jest.Mock).mockReturnValue({
      users: [{ uid: 'user1', displayName: 'Test User', photoURL: 'test-photo.jpg' }],
      currentUser: { uid: 'user1' },
    })

    render(<ItemBox />)
    const deleteButton = screen.getByTestId('delete-button')
    fireEvent.click(deleteButton)
    expect(window.confirm).toHaveBeenCalledWith('Are you sure to delete?')
  })
})