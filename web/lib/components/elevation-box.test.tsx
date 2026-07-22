import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import '@testing-library/jest-dom'
import { initialize, LatLng } from '@googlemaps/jest-mocks'
import { Mock } from 'vitest'
import { useConfig } from '../utils/config'
import { useData } from '../utils/data-context'
import { useMapContext } from '../utils/map-context'
import ElevationBox from './elevation-box'

// Rechartsのモック
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
}))

vi.mock('../utils/config', () => ({
  useConfig: vi.fn(),
}))

vi.mock('../utils/data-context', () => ({
  useData: vi.fn(),
}))

vi.mock('../utils/map-context', () => ({
  useMapContext: vi.fn(),
}))

describe('ElevationBox', () => {
  const mockElevationService = {
    getElevationAlongPath: vi.fn(),
  }

  beforeAll(() => {
    initialize()
    global.google = {
      ...global.google,
      maps: {
        ...global.google.maps,
        geometry: {
          ...global.google.maps.geometry,
          encoding: {
            ...global.google.maps.geometry.encoding,
            decodePath: vi.fn((_encodedPath: string) => [
              new LatLng(35.6762, 139.6503),
            ]),
          },
        },
        ElevationService: vi.fn().mockImplementation(function () {
          return mockElevationService
        }),
        ElevationStatus: {
          OK: 'OK',
        } as typeof google.maps.ElevationStatus,
      },
    }
    vi.clearAllMocks()
  })

  it('renders null when no selectedItem is present', () => {
    ;(useData as Mock).mockReturnValue([{ current: null }])
    ;(useMapContext as Mock).mockReturnValue([{ map: null }])

    const { container } = render(<ElevationBox />)
    expect(container.firstChild).toBeNull()
  })

  it('renders null when selectedItem is present but no chartData', () => {
    ;(useData as Mock).mockReturnValue([{ current: { path: 'encodedPath' } }])
    ;(useMapContext as Mock).mockReturnValue([
      { map: {}, elevationInfoWindow: {} },
    ])
    ;(useConfig as Mock).mockReturnValue({
      shapeStyles: { polylines: { current: { strokeColor: '#000000' } } },
    })

    const { container } = render(<ElevationBox />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the elevation box with Recharts components', async () => {
    // モックで標高データを返すように設定
    mockElevationService.getElevationAlongPath.mockImplementation(
      (request, callback) => {
        const results = [
          {
            elevation: 100,
            location: { lat: () => 35.6762, lng: () => 139.6503 },
          },
          {
            elevation: 110,
            location: { lat: () => 35.6763, lng: () => 139.6504 },
          },
        ]
        callback(results, 'OK')
      },
    )

    ;(useData as Mock).mockReturnValue([{ current: { path: 'encodedPath' } }])
    ;(useMapContext as Mock).mockReturnValue([
      { map: {}, elevationInfoWindow: {} },
    ])
    ;(useConfig as Mock).mockReturnValue({
      shapeStyles: {
        polylines: {
          current: { strokeColor: '#82ca9d' },
        },
      },
    })

    const { rerender } = render(<ElevationBox />)

    // useEffectを再実行させるために再レンダリング
    rerender(<ElevationBox />)

    await waitFor(() => {
      expect(screen.getByTestId('elevation-box')).toBeInTheDocument()
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
      expect(screen.getByTestId('line')).toBeInTheDocument()
      expect(screen.getByTestId('x-axis')).toBeInTheDocument()
      expect(screen.getByTestId('y-axis')).toBeInTheDocument()
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument()
      expect(screen.getByTestId('tooltip')).toBeInTheDocument()
    })
  })

  it('uses default stroke color when config is not available', async () => {
    mockElevationService.getElevationAlongPath.mockImplementation(
      (request, callback) => {
        const results = [
          {
            elevation: 100,
            location: { lat: () => 35.6762, lng: () => 139.6503 },
          },
        ]
        callback(results, 'OK')
      },
    )

    ;(useData as Mock).mockReturnValue([{ current: { path: 'encodedPath' } }])
    ;(useMapContext as Mock).mockReturnValue([
      { map: {}, elevationInfoWindow: {} },
    ])
    ;(useConfig as Mock).mockReturnValue(null)

    const { rerender } = render(<ElevationBox />)
    rerender(<ElevationBox />)

    await waitFor(() => {
      expect(screen.getByTestId('elevation-box')).toBeInTheDocument()
    })
  })

  it('handles elevation service error gracefully', () => {
    mockElevationService.getElevationAlongPath.mockImplementation(
      (request, callback) => {
        callback([], 'ERROR')
      },
    )

    ;(useData as Mock).mockReturnValue([{ current: { path: 'encodedPath' } }])
    ;(useMapContext as Mock).mockReturnValue([
      { map: {}, elevationInfoWindow: {} },
    ])
    ;(useConfig as Mock).mockReturnValue({
      shapeStyles: { polylines: { current: { strokeColor: '#000000' } } },
    })

    const { container } = render(<ElevationBox />)

    // エラー時は何も表示されない
    expect(container.firstChild).toBeNull()
  })
})
