import React from 'react';
import { MemoryRouter } from "react-router-dom"
import Enzyme, { mount } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import BodyContainer from '../src/body';
import configureStore from 'redux-mock-store';
import { createStore } from 'redux';
import { Provider } from 'react-redux';
import { reducers } from '../src/app';

Enzyme.configure({ adapter: new Adapter() });

function setup(path, props) {
    const state = createStore(reducers).getState();
    Object.assign(state.main, props);
    const store = configureStore()(state);
    return mount(
        <Provider store={store}>
            <MemoryRouter initialEntries={[path]}>
                <BodyContainer />
            </MemoryRouter>
        </Provider>
    );
}
  
describe('<BodyContainer />', () => {
    let wrapper;
    afterEach(() => {
        wrapper.unmount();
    });
    it('should have <BottomBar /> when path is not /:id', () => {
        wrapper = setup('/', {view: 'content'}); 
        expect(wrapper.find('BottomBar').length).toBe(0);
    });
    it('should have <BottomBar /> when path is /:id', () => {
        wrapper = setup('/1', {view: 'map'}); 
        expect(wrapper.find('BottomBar').length).toBe(1);
    });
});