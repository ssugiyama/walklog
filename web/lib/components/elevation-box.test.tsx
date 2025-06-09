import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ElevationBox from './elevation-box'
import { useConfig } from '../utils/config'
import { useData } from '../utils/data-context'
import { useMapContext } from '../utils/map-context'
import { initialize } from "@googlemaps/jest-mocks"

jest.mock('../utils/config', () => ({
  useConfig: jest.fn(),
}))

jest.mock('../utils/data-context', () => ({
  useData: jest.fn(),
}))

jest.mock('../utils/map-context', () => ({
  useMapContext: jest.fn(),
}))

const mockUpdateChart = jest.fn()
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useEffect: jest.fn().mockImplementation(() => {
    mockUpdateChart()
  })
}))

describe('ElevationBox', () => {
  beforeEach(() => {
    initialize()
    google.maps.geometry = {
      encoding: {
        decodePath: jest.fn(() => [{ lat: 0, lng: 0 }])
      }
    }
    jest.clearAllMocks()

  })

  it('renders null when no selectedItem is present', () => {
    (useData as jest.Mock).mockReturnValue([{ current: null }]);
    (useMapContext as jest.Mock).mockReturnValue([{ map: null }])

    const { container } = render(<ElevationBox />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the elevation box when selectedItem is present', () => {
    (useData as jest.Mock).mockReturnValue([{ current: { path: 'encodedPath' } }]);
    (useMapContext as jest.Mock).mockReturnValue([{ map: {}, elevationInfoWindow: {} }]);
    (useConfig as jest.Mock).mockReturnValue({ drawingStyles: { polylines: { current: { strokeColor: '#000000' } } } })

    render(<ElevationBox />)
    expect(screen.getByTestId('elevation-box')).toBeInTheDocument()
  })

  it('calls updateChart on selectedItem or mapLoaded change', async () => {

    (useData as jest.Mock).mockReturnValue([{ current: { path: 'encodedPath' } }]);
    (useMapContext as jest.Mock).mockReturnValue([{ map: {}, elevationInfoWindow: {} }])

    render(<ElevationBox />)
    await waitFor(() => {
      expect(mockUpdateChart).toHaveBeenCalled()
    })
  })
})