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
    Object.assign(state.router, routing);
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
    it('render typically', () => {
        wrapper = setup('/17', {
            prev_id: 16,
            next_id: 18,
            selected_item: {
                title: 'start - end',
                date: '2018-05-30',
                length: 14.58,
                comment: 'paragraph',
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
        // console.log(wrapper.debug())
        expect(wrapper.find('IconButton').at(0).props().to).toBe('/18');
        expect(wrapper.find('IconButton').at(1).props().to).toBe('/');
        expect(wrapper.find('IconButton').at(2).props().to).toBe('/16');
        expect(wrapper.find('Typography[variant="h6"]').text()).toBe('2018-05-30 : start - end (14.6 km)');
        expect(wrapper.find('Typography[variant="body2"] img').prop('src')).toBe('http://exmaple.com/photo');
        expect(wrapper.find('Typography[variant="body2"] img + span').text()).toBe('Alice');
        expect(wrapper.find('ExpansionPanelDetails div').at(1).props().dangerouslySetInnerHTML.__html)
            .toEqual(expect.stringContaining('<p>paragraph</p>'));
        expect(wrapper.find('EditIcon').length).toBe(0);
    });
    it('show edit button', () => {
        const mainProps = {
            prev_id: 16,
            next_id: 18,
            selected_item: {
                title: 'start - end',
                date: '2018-05-30',
                length: 14.58,
                comment: 'paragraph',
                user_id: 1,
            },
            selected_index: 1,
            current_user: {id : 1},
            users: [{
                id: 1,
                username: 'Alice',
                photo: 'http://exmaple.com/photo',
            }]
        };
        wrapper = setup('/17', mainProps, {
        });
        // console.log(wrapper.debug());
        expect(wrapper.find('EditIcon').length).toBe(1);
    });
    it('selected item is null', () => {
        const mainProps = {
            prev_id: null,
            next_id: null,
            selected_item: null,
            selected_index: null,
        };
        wrapper = setup('/17', mainProps, {});

        expect(wrapper.find('Typography[variant="h6"]').text()).toBe('not found');
    });
    it('next url is more url', () => {
        const mainProps = {
            prev_id: null,
            next_id: null,
            result :{
                offset: 20,
            },
            last_query: 'filter=neighborhood',
            selected_item: {
                title: 'start - end',
                date: '2018-05-30',
                length: 14.58,
                comment: 'paragraph',
                user_id: 1,
            },
            selected_index: 0,
        };
        wrapper = setup('/17', mainProps, {});
        expect(wrapper.find('IconButton').at(2).props().disabled).toBeFalsy();
        expect(wrapper.find('IconButton').at(2).props().to).toBe('/?select=1&offset=20&filter=neighborhood');
    });
    it('next url is more url if last_query is null', () => {
        const mainProps = {
            prev_id: null,
            next_id: null,
            result :{
                offset: 20,
            },
            last_query: null,
            selected_item: {
                title: 'start - end',
                date: '2018-05-30',
                length: 14.58,
                comment: 'paragraph',
                user_id: 1,
            },
            selected_index: 0,
        };
        wrapper = setup('/17', mainProps, {});
        expect(wrapper.find('IconButton').at(2).props().disabled).toBeFalsy();
        expect(wrapper.find('IconButton').at(2).props().to).toBe('/?select=1&offset=20');
    });
    it('prev button and next button are disabled', () => {
        const mainProps = {
            prev_id: null,
            next_id: null,
            result :{
                offset: null,
            },
            last_query: null,
            selected_item: {
                title: 'start - end',
                date: '2018-05-30',
                length: 14.58,
                comment: 'paragraph',
                user_id: 1,
            },
            selected_index: 0,
        };
        wrapper = setup('/17', mainProps, {});
        expect(wrapper.find('IconButton').at(0).props().disabled).toBeTruthy();
        expect(wrapper.find('IconButton').at(2).props().disabled).toBeTruthy();
    });
});