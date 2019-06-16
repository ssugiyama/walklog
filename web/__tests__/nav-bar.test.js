import React from 'react';
import Enzyme, { mount } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import NavBar from '../src/nav-bar';
import configureStore from 'redux-mock-store';
import { Provider } from 'react-redux';

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
            externalLinks: []
        });
        
        expect(wrapper.find('ForwardRef(IconButton)')).toHaveLength(3);
        expect(wrapper.find('ForwardRef(IconButton)').at(2).find('ForwardRef(SvgIcon)').exists()).toBeTruthy();
    });
    it('should have img with avatar when login', () => {
        wrapper = setup({
            currentUser: {
                id: 1,
                username: 'Alice',
                photo: 'http://exmaple.com/photo',
            },
            externalLinks: []
        });
        expect(wrapper.find('ForwardRef(IconButton)')).toHaveLength(3);
        expect(wrapper.find('ForwardRef(IconButton)').at(2).find('img').props().src).toBe('http://exmaple.com/photo');
    });
});