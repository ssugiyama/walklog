import { render, screen, waitFor } from '@testing-library/react'
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing'
import React from 'react'
import '@testing-library/jest-dom'
import { initialize } from '@googlemaps/jest-mocks'
import { Mock } from 'vitest'
import { useConfig } from '@/lib/utils/config'
import { useData } from '@/lib/utils/data-context'
import { useMainContext } from '@/lib/utils/main-context'
import { useMapContext } from '@/lib/utils/map-context'
import GMap from './map'

vi.mock('@/lib/utils/main-context', () => ({
  useMainContext: vi.fn(),
}))

vi.mock('@/lib/utils/map-context', () => ({
  useMapContext: vi.fn(),
}))

vi.mock('@/lib/utils/config', () => ({
  useConfig: vi.fn(),
}))

vi.mock('@/lib/utils/data-context', () => ({
  useData: vi.fn(),
}))

vi.mock('@/lib/actions/walk-actions', () => ({
  getCityAction: vi.fn().mockReturnValue([
    {
      jcode: '123',
      theGeom: vi.fn(),
    },
  ]),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(
    () => new URLSearchParams({ filter: 'cities', cities: '123' }),
  ),
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
    TerraDrawGoogleMapsAdapter: vi.fn().mockImplementation(function () {
      return {}
    }),
    TerraDrawLineStringMode: vi.fn().mockImplementation(function () {
      return {}
    }),
  }
})

vi.mock('terra-draw-google-maps-adapter', () => {
  return {
    TerraDrawGoogleMapsAdapter: vi.fn().mockImplementation(function () {
      return {}
    }),
  }
})

describe('Map Component', () => {
  const mockSetState = vi.fn()
  beforeEach(() => {
    initialize()
    ;(useMainContext as Mock).mockReturnValue([
      { autoGeolocation: false, mode: 'default' },
      vi.fn(),
    ])

    ;(useMapContext as Mock).mockReturnValue([{}, mockSetState])

    ;(useConfig as Mock).mockReturnValue({
      defaultCenter: '35.6895,139.6917',
      defaultRadius: 1000,
      shapeStyles: {
        polylines: { new: {} },
        polygons: {},
        circle: {},
        marker: {},
      },
      mapTypeIds: 'roadmap',
      mapId: 'test-map-id',
    })

    ;(useData as Mock).mockReturnValue([{ rows: [], current: null }])
    google.maps.MapTypeControlStyle = {
      DEFAULT: 0,
      DROPDOWN_MENU: 1,
      HORIZONTAL_BAR: 2,
    }
  })

  it('renders without crashing and initializes map context state', async () => {
    render(<GMap />, { wrapper: withNuqsTestingAdapter() })
    expect(screen.getByTestId('map')).toBeInTheDocument()
    await waitFor(() => {
      expect(mockSetState).toHaveBeenCalled()
    })
  })
})
