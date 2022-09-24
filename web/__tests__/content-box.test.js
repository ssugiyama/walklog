import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import ContentBoxContainer from '../src/components/content-box';
import configureStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material';
import config from 'react-global-configuration';
import '@testing-library/jest-dom';

config.set({
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
                    <ContentBoxContainer />
                </MemoryRouter>
            </ThemeProvider>
        </Provider>
    );
}

describe('<ContentBox />', () => {
    it('should have SearchBox when path is not /:id', () => {
        setup('/', {
            view: {
                view: 'map',
            },
            api: {
                result: {
                    rows: []
                },
            },
            misc: {
                users: [{
                    uid: 1,
                    username: 'Alice',
                    photo: 'http://exmaple.com/photo',
                }],
                years: [],
                months: [],
            },
            searchForm: {
                filter: '',
                order: 'newest_first',
                user: '',
            },
        });
        // screen.debug();
        expect(screen.queryByTestId('SearchBox')).toBeInTheDocument();
        expect(screen.queryByTestId('ItemBox')).not.toBeInTheDocument();
    });
    it('should have ItemBox when path is /:id', () => {
        setup('/1', {
            view: 'map',
            api: {
                result: {
                    rows: []
                },
            },
            misc: {
                users: [{
                    uid: 1,
                    username: 'Alice',
                    photo: 'http://exmaple.com/photo',
                }],
                years: [],
                months: [],
            },
            searchForm: {
                filter: '',
                order: 'newest_first',
                user: '',
            },
        });
        expect(screen.queryByTestId('SearchBox')).not.toBeInTheDocument();
        expect(screen.queryByTestId('ItemBox')).toBeInTheDocument();
    });
});