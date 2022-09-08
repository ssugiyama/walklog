import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import BodyContainer from '../src/components/body';
import configureStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material';
import config from 'react-global-configuration';
import firebase from 'firebase/app';
import '@testing-library/jest-dom';

config.set({
    googleApiKey: '',
    firebaseConfig: {},
    itemPrefix: '/',
});

firebase.initializeApp = jest.fn();

function setup(path, props) {
    const state = {
        main: props,
        router: {},
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
        </Provider>
    );
}

describe('<BodyContainer />', () => {
    it('should have invisible <BottomBar /> and vivible <ContentBox /> when view == content', () => {
        setup('/', {
            view: 'content',
            users: [{
                uid: 1,
                username: 'Alice',
                photo: 'http://exmaple.com/photo',
            }],
            searchForm: {
                filter: '',
                order: 'newest_first',
                user: '',
            },
            result: {
                rows: [],
            },
            years: [2000],
            months: [1],
            walkEditorOpened: false,
        });
        expect(screen.queryByTestId('BottomBar')).not.toBeVisible();
        expect(screen.queryByTestId('ContentBox')).toBeVisible();
    });
    it('should have visible <BottomBar /> and invivible <ContentBox /> when view == map', () => {
        setup('/1', {
            view: 'map',
            users: [{
                uid: 1,
                username: 'Alice',
                photo: 'http://exmaple.com/photo',
            }],
            searchForm: {
                filter: '',
                order: 'newest_first',
                user: '',
            },
            result: {
                rows: [],
            },
            walkEditorOpened: false,
        });
        expect(screen.queryByTestId('BottomBar')).toBeVisible();
        expect(screen.queryByTestId('ContentBox')).not.toBeVisible();
    });
});