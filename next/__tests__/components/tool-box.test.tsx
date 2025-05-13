import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import ToolBox from '../../lib/components/tool-box';
import { MainProvider } from '../../lib/utils/main-context';
import { MapProvider } from '../../lib/utils/map-context';
import { ConfigProvider } from '../../lib/utils/config';

// Test configuration
const TEST_TIMEOUT = 10000;
jest.setTimeout(TEST_TIMEOUT);

// Mock the Google Maps API
const mockMap = {
  setCenter: jest.fn(),
};

const mockMarker = {
  setMap: jest.fn(),
  set position(pos) {
    this._position = pos;
  },
  get position() {
    return this._position;
  },
  set map(map) {
    this._map = map;
    this.setMap(map);
  },
  get map() {
    return this._map;
  },
  _position: null,
  _map: null,
};

const mockGeocoder = {
  geocode: jest.fn(),
};

const mockMapContext = {
  state: {
    map: mockMap,
    marker: mockMarker,
    pathManager: {
      getEncodedSelection: jest.fn().mockReturnValue('mock_path'),
      get: jest.fn().mockReturnValue(5.5),
      set: jest.fn(),
    },
    downloadPath: jest.fn(),
    uploadPath: jest.fn(),
    clearPaths: jest.fn(),
    addPoint: jest.fn(),
  },
};

const mockMainContext = {
  mainState: {
    autoGeoLocation: false,
    toolBoxOpen: true,
  },
  dispatchMain: jest.fn(),
};

const mockConfig = {
  googleApiKey: 'mock_api_key',
  mapTypeIds: 'roadmap,hybrid',
};

// Mock the geolocation API
const mockGeolocation = {
  getCurrentPosition: jest.fn().mockImplementation((success) => 
    success({
      coords: {
        latitude: 35.6812,
        longitude: 139.7671,
      },
    })
  ),
};

// Mock the Google Maps libraries
global.google = {
  maps: {
    importLibrary: jest.fn().mockResolvedValue({}),
    Geocoder: jest.fn().mockImplementation(() => mockGeocoder),
    GeocoderStatus: {
      OK: 'OK',
      ERROR: 'ERROR',
    },
  },
};

// Setup for all tests
beforeEach(() => {
  jest.clearAllMocks();
  // Mock the geolocation API
  global.navigator.geolocation = mockGeolocation;
});

jest.mock('../../lib/utils/map-context', () => ({
  useMapContext: jest.fn().mockImplementation(() => mockMapContext),
  MapProvider: ({ children }) => <div data-testid="map-provider">{children}</div>,
}));

jest.mock('../../lib/utils/main-context', () => ({
  useMainContext: jest.fn().mockImplementation(() => mockMainContext),
  MainProvider: ({ children }) => <div data-testid="main-provider">{children}</div>,
}));

jest.mock('../../lib/utils/config', () => ({
  useConfig: jest.fn().mockImplementation(() => mockConfig),
  ConfigProvider: ({ children }) => <div data-testid="config-provider">{children}</div>,
}));

describe('ToolBox Component', () => {
  it('renders correctly when open', () => {
    render(
      <ConfigProvider config={mockConfig}>
        <MainProvider>
          <MapProvider>
            <ToolBox open={true} />
          </MapProvider>
        </MainProvider>
      </ConfigProvider>
    );
    
    expect(screen.getByText('path')).toBeInTheDocument();
    expect(screen.getByText('move')).toBeInTheDocument();
    expect(screen.getByText('edit')).toBeInTheDocument();
    expect(screen.getByText('clear')).toBeInTheDocument();
    expect(screen.getByText('download')).toBeInTheDocument();
    expect(screen.getByText('upload')).toBeInTheDocument();
    expect(screen.getByText('record')).toBeInTheDocument();
    expect(screen.getByText('5.5km')).toBeInTheDocument();
    expect(screen.getByText('here')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('location...')).toBeInTheDocument();
  });

  it('handles current location button click', async () => {
    render(
      <ConfigProvider config={mockConfig}>
        <MainProvider>
          <MapProvider>
            <ToolBox open={true} />
          </MapProvider>
        </MainProvider>
      </ConfigProvider>
    );
    
    // Click the "here" button to get current location
    fireEvent.click(screen.getByText('here'));
    
    // Verify the geolocation API was called
    expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
    
    // Wait for the marker to be updated
    await waitFor(() => {
      expect(mockMarker.position).toEqual({
        lat: 35.6812,
        lng: 139.7671,
      });
      expect(mockMarker.map).toBe(mockMap);
      expect(mockMap.setCenter).toHaveBeenCalledWith(mockMarker.position);
    });
  });

  it('handles location search', async () => {
    // Mock successful geocode response
    mockGeocoder.geocode.mockImplementation((request, callback) => {
      callback([
        {
          geometry: {
            location: {
              lat: () => 35.6812,
              lng: () => 139.7671,
            },
          },
        },
      ], 'OK');
    });

    render(
      <ConfigProvider config={mockConfig}>
        <MainProvider>
          <MapProvider>
            <ToolBox open={true} />
          </MapProvider>
        </MainProvider>
      </ConfigProvider>
    );
    
    // Type a location and press enter
    const locationInput = screen.getByPlaceholderText('location...');
    fireEvent.change(locationInput, { target: { value: 'Tokyo' } });
    fireEvent.keyPress(locationInput, { key: 'Enter', charCode: 13 });
    
    // Verify the geocoder was called
    expect(mockGeocoder.geocode).toHaveBeenCalledWith(
      { address: 'Tokyo' },
      expect.any(Function)
    );
    
    // Check marker was updated
    await waitFor(() => {
      expect(mockMarker.position).toEqual({
        lat: 35.6812,
        lng: 139.7671,
      });
      expect(mockMarker.map).toBe(mockMap);
      expect(mockMap.setCenter).toHaveBeenCalledWith(mockMarker.position);
    });
  });

  it('handles toggle record function', async () => {
    render(
      <ConfigProvider config={mockConfig}>
        <MainProvider>
          <MapProvider>
            <ToolBox open={true} />
          </MapProvider>
        </MainProvider>
      </ConfigProvider>
    );
    
    // Click the record button
    fireEvent.click(screen.getByText('record'));
    
    // Verify geolocation API was called
    expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
    
    // Verify dispatch was called to update autoGeoLocation state
    await waitFor(() => {
      expect(mockMainContext.dispatchMain).toHaveBeenCalledWith({
        type: 'SET_AUTO_GEO_LOCATION',
        payload: true,
      });
    });
  });

  it('handles path editing', () => {
    render(
      <ConfigProvider config={mockConfig}>
        <MainProvider>
          <MapProvider>
            <ToolBox open={true} />
          </MapProvider>
        </MainProvider>
      </ConfigProvider>
    );
    
    // Click the edit button
    fireEvent.click(screen.getByText('edit'));
    
    // Verify pathManager.set was called with editable=true
    expect(mockMapContext.state.pathManager.set).toHaveBeenCalledWith('editable', true);
  });

  it('handles path clearing', () => {
    render(
      <ConfigProvider config={mockConfig}>
        <MainProvider>
          <MapProvider>
            <ToolBox open={true} />
          </MapProvider>
        </MainProvider>
      </ConfigProvider>
    );
    
    // Click the clear button
    fireEvent.click(screen.getByText('clear'));
    
    // Verify clearPaths was called
    expect(mockMapContext.state.clearPaths).toHaveBeenCalled();
  });
});