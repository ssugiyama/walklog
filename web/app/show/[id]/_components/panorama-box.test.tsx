import { initialize } from '@googlemaps/jest-mocks'
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { Mock } from 'vitest'
import { useData } from '@/lib/utils/data-context'
import { useMainContext } from '@/lib/utils/main-context'
import { useMapContext } from '@/lib/utils/map-context'
import PanoramaBox from './panorama-box'

vi.mock('@/lib/utils/main-context', () => ({
  useMainContext: vi.fn(),
}))

vi.mock('@/lib/utils/data-context', () => ({
  useData: vi.fn(),
}))

vi.mock('@/lib/utils/map-context', () => ({
  useMapContext: vi.fn(),
}))

describe('PanoramaBox', () => {
  const mockDispatchMain = vi.fn()
  const mockSetStreetView = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    initialize()
    google.maps.geometry = {
      ...global.google.maps.geometry,
      spherical: {
        ...global.google.maps.geometry.spherical,
        computeHeading: vi.fn(() => 0),
        computeDistanceBetween: vi.fn(() => 1000),
      },
    }

    ;(useMainContext as Mock).mockReturnValue([
      {
        overlay: false,
        panoramaIndex: 0,
        panoramaCount: 10,
      },
      mockDispatchMain,
    ])

    ;(useData as Mock).mockReturnValue([
      {
        current: {
          path: [
            [0, 0],
            [1, 1],
          ],
        },
      },
    ])

    ;(useMapContext as Mock).mockReturnValue([
      {
        map: {
          setStreetView: mockSetStreetView,
          getStreetView: vi.fn(() => ({
            setPosition: vi.fn(),
            setPov: vi.fn(),
          })),
        },
      },
    ])
  })

  it('renders the PanoramaBox component', () => {
    render(<PanoramaBox />)
    expect(screen.getByLabelText('overlay')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('toggles overlay switch', () => {
    render(<PanoramaBox />)
    const overlaySwitch = screen.getByLabelText('overlay')
    fireEvent.click(overlaySwitch)
    expect(mockDispatchMain).toHaveBeenCalledWith({
      type: 'SET_OVERLAY',
      payload: true,
    })
  })

  it('handles panorama index button clicks', () => {
    render(<PanoramaBox />)
    const forwardButton = screen.getByTestId('forward-1-button')
    const backButton = screen.getByTestId('backward-1-button')

    fireEvent.click(forwardButton)
    expect(mockDispatchMain).toHaveBeenCalledWith({
      type: 'SET_PANORAMA_INDEX',
      payload: 1,
    })

    fireEvent.click(backButton)
    expect(mockDispatchMain).toHaveBeenCalledWith({
      type: 'SET_PANORAMA_INDEX',
      payload: -1,
    })
  })

  it('renders the panorama box when overlay is false', () => {
    render(<PanoramaBox />)
    const panoramaBox = screen.getByTestId('panorama-box')
    expect(panoramaBox).toBeVisible()
  })

  it('does not render panorama box when overlay is true', () => {
    ;(useMainContext as Mock).mockReturnValue([
      {
        overlay: true,
        panoramaIndex: 0,
        panoramaCount: 10,
      },
      mockDispatchMain,
    ])
    render(<PanoramaBox />)
    expect(screen.queryByTestId('panorama-box')).not.toBeVisible()
  })
})
