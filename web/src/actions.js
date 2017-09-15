// actions
import * as ActionTypes from './action-types';
require('isomorphic-fetch');
import { push } from 'react-router-redux';

export function setSearchForm(payload) {
    return {
        type: ActionTypes.SET_SEARCH_FORM,
        payload
    };
}

export function resetSearchForm() {
    return {
        type: ActionTypes.RESET_SEARCH_FORM,
    };
}

function searchStart() {
    return {
        type: ActionTypes.SEARCH_START,
    };
}
function searchResult(data, append) {
    return {
        type: ActionTypes.SEARCH_RESULT,
        data,
        append,
    };
}

export function search(props, show, prefix = '/') {
    return dispatch => {
        dispatch(searchStart());
        let keys = ['id', 'user', 'date', 'filter', 'year', 'month', 'radius', 'longitude', 'latitude', 'cities', 'searchPath', 'limit', 'order'];
        let params = keys.filter(key => props[key]).map(key => `${key}=${encodeURIComponent(props[key])}`).join('&');
        return fetch(prefix + 'api/search?' + params)
            .then(response => response.json())
            .then(data => {
                dispatch(searchResult(data, false));
                if (!data.error && show == 'first' && data.rows.length > 0) {
                    dispatch(setSelectedItem(data.rows[0], 0));
                }
                else if (!data.error && show == 'all') {
                    dispatch(addPaths(data.rows.map(row => row.path)));
                }
            })
            .catch(ex => { dispatch(searchResult({error: ex, rows: []}, false)); });
    };
}

export function getMoreItems(params, show) {
    return dispatch => {
        fetch('/api/search?' + params)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    dispatch(searchResult(null, data.error.message, false));
                    return;
                }
                dispatch(searchResult(data, true));
                if (show == 'first' && data.rows.length > 0) {
                    dispatch(push('/' + data.rows[0].id));
                }
            })
            .catch(ex => { dispatch(searchResult({error: ex, rows: []}, false)); });
    };
}

export function setSelectedItem(item, index) {
    return {
        type: ActionTypes.SET_SELECTED_ITEM,
        item,
        index
    };
}

export function setSelectedPath(path) {
    return {
        type: ActionTypes.SET_SELECTED_PATH,
        path
    };
}

export function toggleSidebar() {
    return {
        type: ActionTypes.TOGGLE_SIDEBAR,
    };
}

export function setTabValue(value) {
    return {
        type: ActionTypes.SET_TAB_VALUE,
        value
    };
}

export function addPaths(paths) {
    return {
        type: ActionTypes.ADD_PATHS,
        paths
    };
}

export function deleteSelectedPath() {
    return {
        type: ActionTypes.DELETE_SELECTED_PATH
    };
}

export function clearPaths() {
    return {
        type: ActionTypes.CLEAR_PATHS
    };
}

export function setEditingPath() {
    return {
        type: ActionTypes.SET_EDITING_PATH
    };
}

export function openWalkEditor(open, mode) {
    return {
        type: ActionTypes.OPEN_WALK_EDITOR,
        open,
        mode
    };
}

export function openIOModal(open) {
    return {
        type: ActionTypes.OPEN_IO_MODAL,
        open
    };
}

export function openGeocodeModal(open) {
    return {
        type: ActionTypes.OPEN_GEOCODE_MODAL,
        open
    };
}

export function setStreetView(panorama) {
    return {
        type: ActionTypes.SET_STREET_VIEW,
        panorama
    };
}

export function setInfoWindow(payload) {
    return {
        type: ActionTypes.SET_INFO_WINDOW,
        payload
    };
}

export function setCenter(center) {
    return {
        type: ActionTypes.SET_CENTER,
        center,
    };
}

export function removeFromActionQueue() {
    return {
        type: ActionTypes.REMOVE_FROM_ACTION_QUEUE,
    };
}

export function setPanoramaCount(count) {
    return {
        type: ActionTypes.SET_PANORAMA_COUNT,
        count,
    };
}

export function setPanoramaIndex(index) {
    return {
        type: ActionTypes.SET_PANORAMA_INDEX,
        index,
    };
}

export function setOverlay(overlay) {
    return {
        type: ActionTypes.SET_OVERLAY,
        overlay,
    };
}

export function setCurrentUser(user) {
    return {
        type: ActionTypes.SET_CURRENT_USER,
        user,
    };
}

export function setUsers(users) {
    return {
        type: ActionTypes.SET_USERS,
        users,
    };
}

export function openMessage(message) {
    return {
        type: ActionTypes.OPEN_MESSAGE,
        message,
    };    
}
