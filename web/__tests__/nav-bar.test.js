import React from 'react';
import { MemoryRouter } from "react-router-dom"
import Enzyme, { mount } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import NavBarContainer from '../src/nav-bar';
import configureStore from 'redux-mock-store';
import { createStore } from 'redux';
import { Provider } from 'react-redux';
import { reducers } from '../src/app';

Enzyme.configure({ adapter: new Adapter() });

function setup(props) {
    const state = createStore(reducers).getState();
    Object.assign(state.main, props);
    Object.assign(state.routing, {});
    const store = configureStore()(state);
    return mount(
        <Provider store={store}>
            <NavBarContainer />
        </Provider>
    );
}
  
describe('<NavBarContainer />', () => {
    let wrapper;
    afterEach(() => {
        wrapper.unmount();
    });
    it('not logged in', () => {
        wrapper = setup({
        });
        expect(wrapper.find('IconButton').at(1).find('AccountCircle').exists()).toBeTruthy();
    });
    it('logged in', () => {
        wrapper = setup({
            current_user: {
                id: 1,
                username: 'Alice',
                photo: 'http://exmaple.com/photo',
            },
        });
        expect(wrapper.find('IconButton').at(1).find('img').props().src).toBe('http://exmaple.com/photo');
    });
});