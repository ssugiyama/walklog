import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import Map from './map'
import { useMainContext } from '../utils/main-context'
import { useMapContext } from '../utils/map-context'
import { useConfig } from '../utils/config'
import { useData } from '../utils/data-context'
import { initialize } from "@googlemaps/jest-mocks"

jest.mock('../utils/main-context', () => ({
  useMainContext: jest.fn(),
}))

jest.mock('../utils/map-context', () => ({
  useMapContext: jest.fn(),
}))

jest.mock('../utils/config', () => ({
  useConfig: jest.fn(),
}))

jest.mock('../utils/data-context', () => ({
  useData: jest.fn(),
}))

jest.mock('@/app/lib/walk-actions', () => ({
  getCityAction: jest.fn().mockReturnValue(
    [
      {
        jcode: '123',
        theGeom: jest.fn(),
      },
    ]
  ),
}))

jest.mock('use-query-params', () => ({
  useQueryParam: jest.fn(() => ['', jest.fn()]),
  StringParam: jest.fn(),
  withDefault: jest.fn((param, defaultValue) => [param, defaultValue]),
  NumberParam: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(() => new URLSearchParams({ filter: 'cities', cities: '123' })),
  usePathname: jest.fn(() => '/show/1'),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
  })),
}))

jest.mock('@googlemaps/js-api-loader', () => ({
  Loader: jest.fn().mockImplementation(() => ({
    importLibrary: jest.fn().mockResolvedValue(true),
  })),
}))

describe('Map Component', () => {
  const mockSetState = jest.fn()
  beforeEach(() => {
    initialize();
    (useMainContext as jest.Mock).mockReturnValue([
      { autoGeolocation: false, mode: 'default' },
      jest.fn(),
    ]);

    (useMapContext as jest.Mock).mockReturnValue([
      {},
      mockSetState,
    ]);

    (useConfig as jest.Mock).mockReturnValue({
      defaultCenter: '35.6895,139.6917',
      defaultRadius: 1000,
      shapeStyles: { polylines: {}, polygons: {}, circle: {}, marker: {} },
      mapTypeIds: 'roadmap',
      mapId: 'test-map-id',
    });

    (useData as jest.Mock).mockReturnValue([
      { rows: [], current: null },
    ])
    google.maps.MapTypeControlStyle = {
      DROPDOWN_MENU: 1,
    }
    google.maps.drawing = {
      OverlayType: {
        POLYGON: 'polygon',
        POLYLINE: 'polyline',
        CIRCLE: 'circle',
      },
      DrawingManager: jest.fn().mockImplementation(() => ({
        setMap: jest.fn(),
        setOptions: jest.fn(),
        addListener: jest.fn(),
        setDrawingMode: jest.fn(),
      })),
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