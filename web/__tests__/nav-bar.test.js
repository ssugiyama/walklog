import React from 'react';
import Enzyme, { mount } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import NavBar from '../src/components/nav-bar';
import configureStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import firebase from 'firebase/app';
import config from 'react-global-configuration';

config.set({
    firebaseConfig: {},
});

firebase.initializeApp = jest.fn();

Enzyme.configure({ adapter: new Adapter() });


function setup(props) {
    const state = {
        main: props,
        router: {}
    };
    const store = configureStore()(state);
    return mount(
        <Provider store={store}>
            <NavBar />
        </Provider>
    );
}

describe('<NavBar />', () => {
    let wrapper;

    afterEach(() => {
        wrapper.unmount();
    });

    it('should hace IconButton with SvgIcon when logoff', () => {
        wrapper = setup({
        });

        expect(wrapper.find('ForwardRef(IconButton)')).toHaveLength(2);
        expect(wrapper.find('ForwardRef(IconButton)').at(1).find('ForwardRef(SvgIcon)').exists()).toBeTruthy();
    });
    it('should have img with avatar when login', () => {
        wrapper = setup({
            currentUser: {
                uid: 'uid',
                displayName: 'Alice',
                photoURL: 'http://exmaple.com/photo',
            },
        });
        expect(wrapper.find('ForwardRef(IconButton)')).toHaveLength(2);
        expect(wrapper.find('ForwardRef(IconButton)').at(1).find('img').props().src).toBe('http://exmaple.com/photo');
    });
});