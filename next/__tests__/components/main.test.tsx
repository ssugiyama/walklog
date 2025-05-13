import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Main from '@/lib/components//main';
import { MainContextProvider } from '@/lib//utils/main-context';
import { DataProvider } from '@/lib/utils/data-context';


// Mock dependencies
jest.mock('./nav-bar', () => function MockNavBar() {
  return <div data-testid="nav-bar">Nav Bar</div>;
});

jest.mock('./tool-box', () => function MockToolBox() {
  return <div data-testid="tool-box">Tool Box</div>;
});

jest.mock('./map', () => function MockMap() {
  return <div data-testid="map">Map Component</div>;
});

jest.mock('./bottom-bar', () => function MockBottomBar() {
  return <div data-testid="bottom-bar">Bottom Bar</div>;
});

jest.mock('../utils/map-context', () => ({
  MapContextProvider: ({ children }) => <div data-testid="map-context-provider">{children}</div>,
}));

jest.mock('use-query-params', () => ({
  QueryParamProvider: ({ children }) => <div data-testid="query-param-provider">{children}</div>,
}));

jest.mock('next-query-params/app', () => ({}));

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockImplementation(() => Promise.resolve()),
  },
  writable: true,
});

// Mock share API
Object.defineProperty(navigator, 'share', {
  value: jest.fn().mockImplementation(() => Promise.resolve()),
  writable: true,
});

const defaultMainState = {
  mode: 'map',
  toolBoxOpened: false,
  message: null,
};

const defaultData = {
  current: null,
  records: [],
};

// Wrapper for the component under test
function renderWithProviders(ui, { mainState = defaultMainState, data = defaultData } = {}) {
  const dispatchMain = jest.fn();
  
  return {
    ...render(
      <DataContextProvider initialData={data}>
        <MainContextProvider initialState={mainState} testDispatch={dispatchMain}>
          {ui}
        </MainContextProvider>
      </DataContextProvider>
    ),
    dispatchMain,
  };
}

describe('Main Component', () => {
  test('renders correctly in map mode', () => {
    renderWithProviders(
      <Main>
        <div data-testid="main-children">Test Content</div>
      </Main>
    );
    
    expect(screen.getByTestId('map')).toBeInTheDocument();
    expect(screen.getByTestId('bottom-bar')).toBeInTheDocument();
    
    // Children should not be visible in map mode
    const childContent = screen.getByTestId('main-children');
    expect(childContent).not.toBeVisible();
  });

  test('renders correctly in content mode', () => {
    renderWithProviders(
      <Main>
        <div data-testid="main-children">Test Content</div>
      </Main>,
      { mainState: { ...defaultMainState, mode: 'content' } }
    );
    
    expect(screen.getByTestId('map')).toBeInTheDocument();
    // Bottom bar should be hidden in content mode
    const bottomBar = screen.getByTestId('bottom-bar');
    expect(bottomBar.parentElement).toHaveStyle('display: none');
    
    // Children should be visible in content mode
    const childContent = screen.getByTestId('main-children');
    expect(childContent).toBeVisible();
  });

  test('toggle view button switches between map and content mode', () => {
    const { dispatchMain } = renderWithProviders(
      <Main>
        <div>Test Content</div>
      </Main>
    );
    
    // Find and click the toggle view button
    const toggleButton = screen.getByLabelText('toggle view');
    fireEvent.click(toggleButton);
    
    // Should dispatch the TOGGLE_VIEW action
    expect(dispatchMain).toHaveBeenCalledWith({ type: 'TOGGLE_VIEW' });
  });

  test('share button opens share dialog if navigator.share is available', async () => {
    renderWithProviders(
      <Main>
        <div>Test Content</div>
      </Main>
    );
    
    // Find and click the share button
    const shareButton = screen.getByLabelText('share');
    fireEvent.click(shareButton);
    
    // Should call navigator.share
    await waitFor(() => {
      expect(navigator.share).toHaveBeenCalled();
    });
  });
  
  test('share button copies to clipboard if navigator.share is not available', async () => {
    // Temporarily remove navigator.share
    const originalShare = navigator.share;
    delete navigator.share;
    
    const { dispatchMain } = renderWithProviders(
      <Main>
        <div>Test Content</div>
      </Main>
    );
    
    // Find and click the share button
    const shareButton = screen.getByLabelText('share');
    fireEvent.click(shareButton);
    
    // Should use clipboard API and show notification
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
      expect(dispatchMain).toHaveBeenCalledWith({ 
        type: 'OPEN_SNACKBAR', 
        payload: 'copied to clipboard' 
      });
    });
    
    // Restore navigator.share
    navigator.share = originalShare;
  });

  test('snackbar closes after a timeout', () => {
    const { dispatchMain } = renderWithProviders(
      <Main>
        <div>Test Content</div>
      </Main>,
      { mainState: { ...defaultMainState, message: 'Test message' } }
    );
    
    // Find the snackbar
    const snackbar = screen.getByText('Test message');
    expect(snackbar).toBeInTheDocument();
    
    // Simulate the close event
    const closeEvent = new Event('close');
    fireEvent(snackbar, closeEvent);
    
    // Should dispatch the CLOSE_SNACKBAR action
    expect(dispatchMain).toHaveBeenCalledWith({ type: 'CLOSE_SNACKBAR' });
  });
  
  test('toolbox is rendered when toolBoxOpened is true', () => {
    renderWithProviders(
      <Main>
        <div>Test Content</div>
      </Main>,
      { mainState: { ...defaultMainState, toolBoxOpened: true } }
    );
    
    // Find the toolbox
    const toolbox = screen.getByTestId('tool-box');
    expect(toolbox).toBeInTheDocument();
    // We could also check for style properties here
  });
});