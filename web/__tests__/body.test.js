import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import Enzyme, { mount } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import BodyContainer from '../src/body';
import configureStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import {ThemeProvider} from '@material-ui/styles';
import { createMuiTheme } from '@material-ui/core';
import config from 'react-global-configuration';

config.set({
    googleApiKey: ''
});

Enzyme.configure({ adapter: new Adapter() });

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
    it('should have <BottomBar /> when path is not /:id', () => {
        wrapper = setup('/', {
            view: 'content',
            users: [{
                id: 1,
                username: 'Alice',
                photo: 'http://exmaple.com/photo',
            }],
            externalLinks: [],
            searchForm: {},
            result: {
                rows: [],
            },
            years: [2000],
            months: [1],
        }); 
        expect(wrapper.find('BottomBar').length).toBe(0);
    });
    it('should have <BottomBar /> when path is /:id', () => {
        wrapper = setup('/1', {
            view: 'map',
            users: [{
                id: 1,
                username: 'Alice',
                photo: 'http://exmaple.com/photo',
            }],
            externalLinks: [],
            searchForm: {},
            result: {
                rows: [],
            },
        }); 
        expect(wrapper.find('BottomBar').length).toBe(1);
    });
});