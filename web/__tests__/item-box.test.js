import React from 'react';
import { MemoryRouter } from "react-router-dom"
import Enzyme, { mount } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import ItemBoxContainer from '../src/item-box';
import configureStore from 'redux-mock-store';
import { createStore } from 'redux';
import { Provider } from 'react-redux';
import { reducers } from '../src/app';

Enzyme.configure({ adapter: new Adapter() });

function setup(path, props, routing) {
    const state = createStore(reducers).getState();
    Object.assign(state.main, props);
    Object.assign(state.routing, routing);
    const store = configureStore()(state);
    return mount(
        <Provider store={store}>
            <MemoryRouter initialEntries={[path]}>
                <ItemBoxContainer />
            </MemoryRouter>
        </Provider>
    );
}
  
describe('<ItemBoxContainer />', () => {
    let wrapper;
    afterEach(() => {
        wrapper.unmount();
    });
    it('check ', () => {
        wrapper = setup('/17', {
            prev_id: 16,
            next_id: 18,
            selected_item: {
                title: 'start - end',
                date: '2018-05-30',
                length: 14.58,
                user_id: 1,
            },
            selected_index: 1,
            users: [{
                id: 1,
                username: 'Alice',
                photo: 'http://exmaple.com/photo',
            }]
        }, {

        });
        expect(wrapper.find('IconButton').get(0).props.to).toBe('/18');
        expect(wrapper.find('IconButton').get(1).props.to).toBe('/');
        expect(wrapper.find('IconButton').get(2).props.to).toBe('/16');
        expect(wrapper.find('Typography[variant="title"]').text()).toBe('2018-05-30 : start - end (14.6 km)');
        expect(wrapper.find('Typography[variant="body1"] img').prop('src')).toBe('http://exmaple.com/photo');
        expect(wrapper.find('Typography[variant="body1"] img + span').text()).toBe('Alice');
    });
});