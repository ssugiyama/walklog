import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import Enzyme, { mount } from 'enzyme';
// import Adapter from 'enzyme-adapter-react-16';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import BodyContainer from '../src/components/body';
import configureStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material';
import config from 'react-global-configuration';
import firebase from 'firebase/app';

config.set({
    googleApiKey: '',
    firebaseConfig: {},
    itemPrefix: '/',
});

firebase.initializeApp = jest.fn();

Enzyme.configure({ adapter: new Adapter() });

function setup(path, props) {
    const state = {
        main: props,
        router: {},
    };
    const store = configureStore()(state);
    const theme = createTheme();
    return mount(
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
    let wrapper;
    afterEach(() => {
        wrapper.unmount();
    });
    it('should have invisible <BottomBar /> and vivible <ContentBox /> when view == content', () => {
        wrapper = setup('/', {
            view: 'content',
            users: [{
                id: 1,
                username: 'Alice',
                photo: 'http://exmaple.com/photo',
            }],
            searchForm: {},
            result: {
                rows: [],
            },
            years: [2000],
            months: [1],
        });
        expect(wrapper.find('BottomBar').prop('sx').display).toBe('none');
        expect(wrapper.find('ContentBox').prop('sx').display).toBe('block');
    });
    it('should have visible <BottomBar /> and invivible <ContentBox /> when view == map', () => {
        wrapper = setup('/1', {
            view: 'map',
            users: [{
                id: 1,
                username: 'Alice',
                photo: 'http://exmaple.com/photo',
            }],
            searchForm: {},
            result: {
                rows: [],
            },
        });
        expect(wrapper.find('BottomBar').prop('sx').display).toBe('block');
        expect(wrapper.find('ContentBox').prop('sx').display).toBe('none');
    });
});