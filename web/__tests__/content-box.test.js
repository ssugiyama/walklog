import React from 'react';
import { MemoryRouter } from "react-router-dom"
import Enzyme, { mount } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import ContentBoxContainer from '../src/content-box';
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
                <ContentBoxContainer />
            </MemoryRouter>
        </Provider>
    );
}

describe('<ContentBox />', () => {
    let wrapper;
    afterEach(() => {
        wrapper.unmount();
    });
    it('should be visible when view == content', () => {
        wrapper = setup('/', {view: 'content'});
        const target = wrapper.find('ContentBox');
        const classes = target.prop('classes');
        expect(target.children().prop('className')).toBe(classes['root']);
    });
    it('should be invisible when view == map', () => {
        wrapper = setup('/', {view: 'map'}); 
        const target = wrapper.find('ContentBox');
        const classes = target.prop('classes');
        expect(target.children().prop('className')).toBe(classes['hidden']);
    });
    it('should have SearchBox when path is not /:id', () => {
        wrapper = setup('/', {view: 'map'}); 
        expect(wrapper.find('SearchBox').length).toBe(1);
        expect(wrapper.find('ItemBox').length).toBe(0);
    });
    it('should have ItemBox when path is /:id', () => {
        wrapper = setup('/1', {view: 'map'}); 
        expect(wrapper.find('SearchBox').length).toBe(0);
        expect(wrapper.find('ItemBox').length).toBe(1);
    });
});