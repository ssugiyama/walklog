import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import Map from './map'
import { useMainContext } from '../utils/main-context'
import { useMapContext } from '../utils/map-context'
import { useConfig } from '../utils/config'
import { useData } from '../utils/data-context'
import { initialize } from '@googlemaps/jest-mocks'

vi.mock('../utils/main-context', () => ({
  useMainContext: vi.fn(),
}))

vi.mock('../utils/map-context', () => ({
  useMapContext: vi.fn(),
}))

vi.mock('../utils/config', () => ({
  useConfig: vi.fn(),
}))

vi.mock('../utils/data-context', () => ({
  useData: vi.fn(),
}))

vi.mock('@/app/lib/walk-actions', () => ({
  getCityAction: vi.fn().mockReturnValue(
    [
      {
        jcode: '123',
        theGeom: vi.fn(),
      },
    ],
  ),
}))

vi.mock('use-query-params', () => ({
  useQueryParam: vi.fn(() => ['', vi.fn()]),
  StringParam: vi.fn(),
  withDefault: vi.fn((param, defaultValue) => [param, defaultValue]),
  NumberParam: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => new URLSearchParams({ filter: 'cities', cities: '123' })),
  usePathname: vi.fn(() => '/show/1'),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
  })),
}))

vi.mock('@googlemaps/js-api-loader', () => ({
  setOptions: vi.fn(),
  importLibrary: vi.fn().mockResolvedValue(true),
}))

vi.mock('terra-draw', () => {
  return {
    TerraDraw: vi.fn().mockImplementation(function () {
      return {
        start: vi.fn(),
        on: vi.fn(),
        getSnapshotFeature: vi.fn(),
        updateModeOptions: vi.fn(),
        setMode: vi.fn(),
        clear: vi.fn(),
      }
    }),
    TerraDrawGoogleMapsAdapter: vi.fn().mockImplementation(function () { return {} }),
    TerraDrawLineStringMode: vi.fn().mockImplementation(function () { return {} }),
  }
})

vi.mock('terra-draw-google-maps-adapter', () => {
  return {
    TerraDrawGoogleMapsAdapter: vi.fn().mockImplementation(function () { return {} }),
  }
})

describe('Map Component', () => {
  const mockSetState = vi.fn()
  beforeEach(() => {
    initialize();
    (useMainContext as vi.Mock).mockReturnValue([
      { autoGeolocation: false, mode: 'default' },
      vi.fn(),
    ]);

    (useMapContext as vi.Mock).mockReturnValue([
      {},
      mockSetState,
    ]);

    (useConfig as vi.Mock).mockReturnValue({
      defaultCenter: '35.6895,139.6917',
      defaultRadius: 1000,
      shapeStyles: { polylines: { new: {} }, polygons: {}, circle: {}, marker: {} },
      mapTypeIds: 'roadmap',
      mapId: 'test-map-id',
    });

    (useData as vi.Mock).mockReturnValue([
      { rows: [], current: null },
    ])
    google.maps.MapTypeControlStyle = {
      DROPDOWN_MENU: 1,
    }
  })

  it('renders without crashing and initializes map context state', async () => {
    render(<Map />)
    expect(screen.getByTestId('map')).toBeInTheDocument()
    await waitFor(() => {
      expect(mockSetState).toHaveBeenCalled()
    })
  })
})