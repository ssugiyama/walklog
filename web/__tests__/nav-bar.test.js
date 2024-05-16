import React from 'react';
import { render, screen } from '@testing-library/react';
import configureStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import config from 'react-global-configuration';
import NavBar from '../src/components/nav-bar';
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
    firebaseConfig: {},
});

function setup(props) {
    const state = {
        router: {},
        map: {},
        panorama: {},
        view: {},
        ...props,
    };
    const store = configureStore()(state);
    return render(
        <Provider store={store}>
            <NavBar />
        </Provider>,
    );
}

describe('<NavBar />', () => {
    it('should hace IconButton with SvgIcon when logoff', () => {
        setup({ misc: {} });
        // screen.debug();
        expect(screen.getByTestId('AccountCircleIcon')).toBeInTheDocument();
    });
    it('should have img with avatar when login', () => {
        setup({
            misc: {
                currentUser: {
                    uid: 'uid',
                    displayName: 'Alice',
                    photoURL: 'http://exmaple.com/photo',
                },
            },
        });
        // screen.debug();
        expect(screen.queryByTestId('AccountCircleIcon')).not.toBeInTheDocument();
        expect(screen.getByAltText('user profile')).toBeInTheDocument();
    });
});
