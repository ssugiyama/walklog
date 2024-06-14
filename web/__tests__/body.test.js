import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import configureStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material';
import config from 'react-global-configuration';
import BodyContainer from '../shared/components/body';
import '@testing-library/jest-dom';

jest.mock('firebase/app', () => ({
    initializeApp: jest.fn(),
}));
jest.mock('firebase/auth', () => ({
    getAuth: jest.fn(),
    GoogleAuthProvider: jest.fn(),
    onAuthStateChanged: jest.fn(),
}));

config.set({
    googleApiKey: '',
    firebaseConfig: {},
    itemPrefix: '/',
});

function setup(path, props) {
    const state = {
        router: {},
        map: {},
        panorama: {},
        ...props,
    };
    const store = configureStore()(state);
    const theme = createTheme();
    return render(
        <Provider store={store}>
            <ThemeProvider theme={theme}>
                <MemoryRouter initialEntries={[path]}>
                    <BodyContainer />
                </MemoryRouter>
            </ThemeProvider>
        </Provider>,
    );
}

describe('<BodyContainer />', () => {
    it('should have invisible <BottomBar /> and vivible <ContentBox /> when view === content', () => {
        setup('/', {
            view: {
                view: 'content',
                walkEditorOpened: false,
            },
            misc: {
                users: [{
                    uid: 1,
                    username: 'Alice',
                    photo: 'http://exmaple.com/photo',
                }],
                years: [2000],
                months: [1],
            },
            searchForm: {
                filter: '',
                order: 'newest_first',
                user: '',
            },
            api: {
                result: {
                    rows: [],
                },
            },
        });
        expect(screen.queryByTestId('BottomBar')).not.toBeVisible();
        expect(screen.queryByTestId('ContentBox')).toBeVisible();
    });
    it('should have visible <BottomBar /> and invivible <ContentBox /> when view === map', () => {
        setup('/1', {
            view: {
                view: 'map',
                walkEditorOpened: false,
            },
            misc: {
                users: [{
                    uid: 1,
                    username: 'Alice',
                    photo: 'http://exmaple.com/photo',
                }],
            },
            searchForm: {
                filter: '',
                order: 'newest_first',
                user: '',
            },
            api: {
                result: {
                    rows: [],
                },
            },
        });
        expect(screen.queryByTestId('BottomBar')).toBeVisible();
        expect(screen.queryByTestId('ContentBox')).not.toBeVisible();
    });
});
