import React from 'react';
import { render, screen } from '@testing-library/react';
import NavBar from '../src/components/nav-bar';
import configureStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import firebase from 'firebase/app';
import config from 'react-global-configuration';
import '@testing-library/jest-dom';

config.set({
    firebaseConfig: {},
});

firebase.initializeApp = jest.fn();

function setup(props) {
    const state = {
        main: props,
        router: {}
    };
    const store = configureStore()(state);
    return render(
        <Provider store={store}>
            <NavBar />
        </Provider>
    );
}

describe('<NavBar />', () => {
    it('should hace IconButton with SvgIcon when logoff', () => {
        setup({});
        screen.debug();
        expect(screen.getByTestId('AccountCircleIcon')).toBeInTheDocument();
    });
    it('should have img with avatar when login', () => {
        setup({
            currentUser: {
                uid: 'uid',
                displayName: 'Alice',
                photoURL: 'http://exmaple.com/photo',
            },
        });
        screen.debug();
        expect(screen.queryByTestId('AccountCircleIcon')).not.toBeInTheDocument();
        expect(screen.getByAltText('user profile')).toBeInTheDocument();
    });
});