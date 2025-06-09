import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PanoramaBox from './panorama-box';
import { useMainContext } from '../utils/main-context';
import { useData } from '../utils/data-context';
import { useMapContext } from '../utils/map-context';
import { initialize } from '@googlemaps/jest-mocks';

jest.mock('../utils/main-context', () => ({
  useMainContext: jest.fn(),
}));

jest.mock('../utils/data-context', () => ({
  useData: jest.fn(),
}));

jest.mock('../utils/map-context', () => ({
  useMapContext: jest.fn(),
}));

describe('PanoramaBox', () => {
  const mockDispatchMain = jest.fn();
  const mockSetStreetView = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    initialize();
    google.maps.geometry = {
      encoding: {
        decodePath: jest.fn(() => [{ lat: jest.fn(() => 0), lng: jest.fn(() => 0) }, { lat: jest.fn(() => 1), lng: jest.fn(() => 1) }]),
      },
      spherical: {
        computeHeading: jest.fn(() => 0),
        computeDistanceBetween: jest.fn(() => 1000),
      }
    };

    (useMainContext as jest.Mock).mockReturnValue([
      {
        overlay: false,
        panoramaIndex: 0,
        panoramaCount: 10,
      },
      mockDispatchMain,
    ]);

    (useData as jest.Mock).mockReturnValue([
      { current: { path: 'encodedPath' } },
    ]);

    (useMapContext as jest.Mock).mockReturnValue([
      {
        map: {
          setStreetView: mockSetStreetView,
          getStreetView: jest.fn(() => ({ setPosition: jest.fn(), setPov: jest.fn() }))
        }
      },
    ])
  });

  it('renders the PanoramaBox component', () => {
    render(<PanoramaBox />);
    expect(screen.getByLabelText('overlay')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('toggles overlay switch', () => {
    render(<PanoramaBox />);
    const overlaySwitch = screen.getByLabelText('overlay');
    fireEvent.click(overlaySwitch);
    expect(mockDispatchMain).toHaveBeenCalledWith({ type: 'SET_OVERLAY', payload: true });
  });

  it('handles panorama index button clicks', () => {
    render(<PanoramaBox />);
    const forwardButton = screen.getByTestId('forward-1-button');
    const backButton = screen.getByTestId('backward-1-button');

    fireEvent.click(forwardButton);
    expect(mockDispatchMain).toHaveBeenCalledWith({ type: 'SET_PANORAMA_INDEX', payload: 1 });

    fireEvent.click(backButton);
    expect(mockDispatchMain).toHaveBeenCalledWith({ type: 'SET_PANORAMA_INDEX', payload: -1 });
  });

  it('renders the panorama box when overlay is false', () => {
    render(<PanoramaBox />);
    const panoramaBox = screen.getByTestId('panorama-box');
    expect(panoramaBox).toBeVisible();
  });

  it('does not render panorama box when overlay is true', () => {
    (useMainContext as jest.Mock).mockReturnValue([
      {
        overlay: true,
        panoramaIndex: 0,
        panoramaCount: 10,
      },
      mockDispatchMain,
    ]);
    render(<PanoramaBox />);
    expect(screen.queryByTestId('panorama-box')).not.toBeVisible();
  })
});