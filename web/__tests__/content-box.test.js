import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import Enzyme, { mount } from 'enzyme';
// import Adapter from 'enzyme-adapter-react-16';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import ContentBoxContainer from '../src/components/content-box';
import configureStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import {ThemeProvider} from '@material-ui/styles';
import { createMuiTheme } from '@material-ui/core';
import config from 'react-global-configuration';

Enzyme.configure({ adapter: new Adapter() });

config.set({
    itemPrefix: '/',
});

function setup(path, props) {
    const state = {
        main: props,
        router: {},
    };
    const store = configureStore()(state);
    const theme = createMuiTheme({});
    return mount(
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
    let wrapper;
    afterEach(() => {
        wrapper.unmount();
    });
    it('should have SearchBox when path is not /:id', () => {
        wrapper = setup('/', {
            view: 'map',
            result: {
                rows: []
            },
            users: [{
                id: 1,
                username: 'Alice',
                photo: 'http://exmaple.com/photo',
            }],
            years: [],
            months: [],
            searchForm: {},
        });
        expect(wrapper.find('SearchBox').length).toBe(1);
        expect(wrapper.find('ItemBox').length).toBe(0);
    });
    it('should have ItemBox when path is /:id', () => {
        wrapper = setup('/1', {
            view: 'map',
            result: {
                rows: []
            },
            users: [{
                id: 1,
                username: 'Alice',
                photo: 'http://exmaple.com/photo',
            }],
            years: [],
            months: [],
            searchForm: {},
        });
        expect(wrapper.find('SearchBox').length).toBe(0);
        expect(wrapper.find('ItemBox').length).toBe(1);
    });
});