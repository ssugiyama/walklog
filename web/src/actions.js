// actions
import * as ActionTypes from './action-types';
require('isomorphic-fetch');
import { push, replace } from 'connected-react-router';

export function setSearchForm(payload) {
    return {
        type: ActionTypes.SET_SEARCH_FORM,
        payload
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

export function search(props, prefix = '/', select, last_query) {
    const offset = Number(props['offset']);
    return dispatch => {
        if (!select && !offset) {
            dispatch(searchStart());
        }
        const keys = ['user', 'date', 'filter', 'year', 'month', 'radius', 'longitude', 'latitude', 'cities', 'searchPath', 'limit', 'order', 'offset'];
        const params = keys.filter(key => props[key]).map(key => `${key}=${encodeURIComponent(props[key])}`).join('&');
        return fetch(prefix + 'api/search?' + params)
            .then(response => response.json())
            .then(data => {
                dispatch(searchResult(data, offset > 0));
                if (select) {
                    dispatch(push('/' + data.rows[0].id));
                }
                else if (offset > 0) {
                    dispatch(replace({pathname: '/', search: last_query}));
                }
            })
            .catch(ex => { dispatch(searchResult({error: ex, rows: []}, false)); });
    };
}

export function getItem(id, prefix = '/') {
    return dispatch => {
        return fetch(prefix + 'api/get/' + id)
            .then(response => response.json())
            .then(data => {
                dispatch(setAdjacentItemIds(data.next_id, data.prev_id));
                if (!data.error && data.rows.length > 0) {
                    dispatch(setSelectedItem(data.rows[0], 0));
                }
            });
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

export function toggleView() {
    return {
        type: ActionTypes.TOGGLE_VIEW,
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

export function setZoom(zoom) {
    return {
        type: ActionTypes.SET_ZOOM,
        zoom,
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

export function setMessage(message) {
    return {
        type: ActionTypes.SET_MESSAGE,
        message,
    };    
}

export function openSnackbar(open) {
    return {
        type: ActionTypes.OPEN_SNACKBAR,
        open,
    };   
}

export function downloadPath() {
    return {
        type: ActionTypes.DOWNLOAD_PATH,
    };
}

export function uploadPath() {
    return {
        type: ActionTypes.UPLOAD_PATH,
    };
}

export function setLastQuery(last_query) {
    return {
        type: ActionTypes.SET_LAST_QUERY,
        last_query,
    };
}

export function setAdjacentItemIds(next_id, prev_id) {
    return {
        type: ActionTypes.SET_ADJACENT_ITEM_IDS,
        next_id, prev_id
    };
}

export function setMap(map) {
    return {
        type: ActionTypes.SET_MAP,
        map
    };
}