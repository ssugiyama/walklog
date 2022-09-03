import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ItemBox from '../src/components/item-box';
import configureStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import config from 'react-global-configuration';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material';
import '@testing-library/jest-dom';

config.set({
    baseUrl: 'http://localhost:3000',
    itemPrefix: '/',
});

function setup(path, props, router) {
    const state = {
        main: props,
        router
    };
    const theme = createTheme();
    const store = configureStore()(state);
    return render(
        <Provider store={store}>
            <ThemeProvider theme={theme}>
                <MemoryRouter initialEntries={[path]}>
                    <ItemBox />
                </MemoryRouter>
            </ThemeProvider>
        </Provider>
    );
}

describe('<ItemBoxContainer />', () => {
    it('render typically', () => {
        setup('/17', {
            prevId: 16,
            nextId: 18,
            selectedItem: {
                title: 'start - end',
                date: '2018-05-30',
                length: 14.58,
                comment: 'paragraph',
                uid: 'uid',
            },
            selectedIndex: 1,
            users: [{
                uid: 'uid',
                displayName: 'Alice',
                photoURL: 'http://exmaple.com/photo',
            }],
            result: {
                rows: [],
                count: 0,
                offset: 0
            }
        }, {
        });
        expect(screen.getAllByRole('link')).toHaveLength(4);
        expect(screen.getAllByRole('link').at(0)).toHaveAttribute('href', '/');
        expect(screen.getAllByRole('link').at(1)).toHaveAttribute('href', '/18');
        expect(screen.getAllByRole('link').at(2)).toHaveAttribute('href', '/16');
        expect(screen.getAllByRole('link').at(3)).toHaveAttribute('href', expect.stringMatching(/twitter\.com/));
        expect(screen.getByRole('heading')).toHaveTextContent('2018-05-30 : start - end (14.6 km)');
        expect(screen.getByRole('img')).toHaveAttribute('src', 'http://exmaple.com/photo');
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('paragraph')).toBeInTheDocument();
    });
    it('show edit button', () => {
        const mainProps = {
            prevId: 16,
            nextId: 18,
            selectedItem: {
                title: 'start - end',
                date: '2018-05-30',
                length: 14.58,
                comment: 'paragraph',
                uid: 'uid',
            },
            selectedIndex: 1,
            currentUser: {uid : 'uid'},
            users: [{
                uid: 'uid',
                displayName: 'Alice',
                photoURL: 'http://exmaple.com/photo',
            }],
            result: {
                rows: [],
                count: 0,
                offset: 0
            }
        };
        setup('/17', mainProps, {});
        expect(screen.getByTestId('EditIcon')).toBeInTheDocument();
    });
    it('selected item is null', () => {
        const mainProps = {
            prevId: null,
            nextId: null,
            selectedItem: null,
            selectedIndex: null,
            result: {},
        };
        setup('/17', mainProps, {});
        expect(screen.getByRole('heading')).toHaveTextContent('not found');
    });
    it('next url is more url', () => {
        const mainProps = {
            prevId: null,
            nextId: null,
            result :{
                offset: 20,
            },
            lastQuery: 'filter=neighborhood',
            selectedItem: {
                title: 'start - end',
                date: '2018-05-30',
                length: 14.58,
                comment: 'paragraph',
                uid: 'uid',
            },
            users: [{
                uid: 'uid',
                displayName: 'Alice',
                photoURL: 'http://exmaple.com/photo',
            }],
            selectedIndex: 0,
        };
        setup('/17', mainProps, {});
        expect(screen.getAllByRole('link').at(1)).toHaveAttribute('href', '/?select=1&offset=20&filter=neighborhood');
    });
    it('next url is more url if last_query is null', () => {
        const mainProps = {
            prevId: null,
            nextId: null,
            result :{
                offset: 20,
            },
            lastQuery: null,
            selectedItem: {
                title: 'start - end',
                date: '2018-05-30',
                length: 14.58,
                comment: 'paragraph',
                uid: 'uid',
            },
            users: [{
                uid: 'uid',
                displayName: 'Alice',
                photoURL: 'http://exmaple.com/photo',
            }],
            selectedIndex: 0,
        };
        setup('/17', mainProps, {});
        expect(screen.getAllByRole('link').at(1)).toHaveAttribute('href', '/?select=1&offset=20');
    });
    it('prev button and next button are disabled', () => {
        const mainProps = {
            prevId: null,
            nextId: null,
            result :{
                offset: null,
            },
            lastQuery: null,
            selectedItem: {
                title: 'start - end',
                date: '2018-05-30',
                length: 14.58,
                comment: 'paragraph',
                uid: 'uid',
            },
            users: [{
                uid: 'uid',
                displayName: 'Alice',
                photoURL: 'http://exmaple.com/photo',
            }],
            selectedIndex: 0,
        };
        setup('/17', mainProps, {});
        expect(screen.getAllByRole('button').at(0)).toHaveAttribute('aria-disabled', 'true');
        expect(screen.getAllByRole('button').at(1)).toHaveAttribute('aria-disabled', 'true');
    });
});