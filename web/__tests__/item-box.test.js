import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import Enzyme, { mount } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import ItemBox from '../src/item-box';
import configureStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import config from 'react-global-configuration';
import {ThemeProvider} from '@material-ui/styles';

Enzyme.configure({ adapter: new Adapter() });

config.set({
    baseUrl: 'http://localhost:3000'
});

function setup(path, props, router) {
    const state = {
        main: props,
        router
    };
    const theme = createMuiTheme({});
    const store = configureStore()(state);
    return mount(
        <Provider store={store}>
            <ThemeProvider theme={theme}>
                <MemoryRouter initialEntries={[path]}>
                    <ItemBox />
                </MemoryRouter>
            </ThemeProvider>
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
            prevId: 16,
            nextId: 18,
            selectedItem: {
                title: 'start - end',
                date: '2018-05-30',
                length: 14.58,
                comment: 'paragraph',
                userId: 1,
            },
            selectedIndex: 1,
            users: [{
                id: 1,
                username: 'Alice',
                photo: 'http://exmaple.com/photo',
            }],
            result: {
                rows: [],
                count: 0,
                offset: 0
            }
        }, {
        });
        // console.log(wrapper.debug())
        expect(wrapper.find('ForwardRef(IconButton)').length).toBe(8);
        expect(wrapper.find('ForwardRef(IconButton)').at(0).props().to).toBe('/18');
        expect(wrapper.find('ForwardRef(Fab)').at(0).props().to).toBe('/');
        expect(wrapper.find('ForwardRef(IconButton)').at(1).props().to).toBe('/16');
        expect(wrapper.find('ForwardRef(Typography)[variant="h6"]').text()).toBe('2018-05-30 : start - end (14.6 km)');
        expect(wrapper.find('ForwardRef(Typography)[variant="body2"] img').prop('src')).toBe('http://exmaple.com/photo');
        expect(wrapper.find('ForwardRef(Typography)[variant="body2"] img + span').text()).toBe('Alice');
        expect(wrapper.find('div[className="react-swipeable-view-container"] div div div').first().props().dangerouslySetInnerHTML.__html)
            .toEqual(expect.stringContaining('<p>paragraph</p>'));
    });
    it('show edit button', () => {
        const mainProps = {
            prevId: 16,
            nextId: 18,
            selectedItem: {
                title: 'start - end',
                date: '2018-05-30',
                length: 14.58,
                comment: 'paragraph',
                userId: 1,
            },
            selectedIndex: 1,
            currentUser: {id : 1},
            users: [{
                id: 1,
                username: 'Alice',
                photo: 'http://exmaple.com/photo',
            }],
            result: {
                rows: [],
                count: 0,
                offset: 0
            }
        };
        wrapper = setup('/17', mainProps, {
        });
        // console.log(wrapper.debug());
        expect(wrapper.find('ForwardRef(IconButton)').length).toBe(9);
    });
    it('selected item is null', () => {
        const mainProps = {
            prevId: null,
            nextId: null,
            selectedItem: null,
            selectedIndex: null,
            result: {},
        };
        wrapper = setup('/17', mainProps, {});
        expect(wrapper.find('ForwardRef(Typography)[variant="h6"]').text()).toBe('not found');
    });
    it('next url is more url', () => {
        const mainProps = {
            prevId: null,
            nextId: null,
            result :{
                offset: 20,
            },
            lastQuery: 'filter=neighborhood',
            selectedItem: {
                title: 'start - end',
                date: '2018-05-30',
                length: 14.58,
                comment: 'paragraph',
                userId: 1,
            },
            users: [{
                id: 1,
                username: 'Alice',
                photo: 'http://exmaple.com/photo',
            }],
            selectedIndex: 0,
        };
        wrapper = setup('/17', mainProps, {});
        expect(wrapper.find('ForwardRef(IconButton)').at(1).props().disabled).toBeFalsy();
        expect(wrapper.find('ForwardRef(IconButton)').at(1).props().to).toBe('/?select=1&offset=20&filter=neighborhood');
    });
    it('next url is more url if last_query is null', () => {
        const mainProps = {
            prevId: null,
            nextId: null,
            result :{
                offset: 20,
            },
            lastQuery: null,
            selectedItem: {
                title: 'start - end',
                date: '2018-05-30',
                length: 14.58,
                comment: 'paragraph',
                userId: 1,
            },
            users: [{
                id: 1,
                username: 'Alice',
                photo: 'http://exmaple.com/photo',
            }],
            selectedIndex: 0,
        };
        wrapper = setup('/17', mainProps, {});
        expect(wrapper.find('ForwardRef(IconButton)').at(1).props().disabled).toBeFalsy();
        expect(wrapper.find('ForwardRef(IconButton)').at(1).props().to).toBe('/?select=1&offset=20');
    });
    it('prev button and next button are disabled', () => {
        const mainProps = {
            prevId: null,
            nextId: null,
            result :{
                offset: null,
            },
            lastQuery: null,
            selectedItem: {
                title: 'start - end',
                date: '2018-05-30',
                length: 14.58,
                comment: 'paragraph',
                userId: 1,
            },
            users: [{
                id: 1,
                username: 'Alice',
                photo: 'http://exmaple.com/photo',
            }],
            selectedIndex: 0,
        };
        wrapper = setup('/17', mainProps, {});
        expect(wrapper.find('ForwardRef(IconButton)').at(0).props().disabled).toBeTruthy();
        expect(wrapper.find('ForwardRef(IconButton)').at(1).props().disabled).toBeTruthy();
    });
});