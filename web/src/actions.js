// actions
import * as ActionTypes from './action-types';
require('isomorphic-fetch');
import { push, replace } from 'connected-react-router';
import config from 'react-global-configuration';

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

export function search(props, prefix = '/', select, lastQuery) {
    const offset = Number(props['offset']);
    return async dispatch => {
        if (!select && !offset) {
            dispatch(searchStart());
        }
        const keys = ['user', 'date', 'filter', 'year', 'month', 'radius', 'longitude', 'latitude', 'cities', 'searchPath', 'limit', 'order', 'offset'];
        const params = keys.filter(key => props[key]).map(key => `${key}=${encodeURIComponent(props[key])}`).join('&');
        try {
            const response = await fetch(prefix + 'api/search?' + params);
            const data = await response.json();
            dispatch(searchResult(data, offset > 0));
            if (select) {
                dispatch(push(config.get('itemPrefix') + data.rows[0].id));
            }
            else if (offset > 0) {
                dispatch(replace({pathname: '/', search: lastQuery}));
            }
        } catch(error) {
            dispatch(searchResult({error, rows: []}, false));
        }
    };
}

export function getItem(id, prefix = '/') {
    return async dispatch => {
        const response = await fetch(prefix + 'api/get/' + id);
        const data = await response.json();
        dispatch(setAdjacentItemIds(data.nextId, data.prevId));
        if (!data.error && data.rows.length > 0) {
            dispatch(setSelectedItem(data.rows[0], 0));
        }
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

export function setEditingPath(pathEditable) {
    return {
        type: ActionTypes.SET_EDITING_PATH,
        pathEditable,
    };
}

export function openWalkEditor(open, mode) {
    return {
        type: ActionTypes.OPEN_WALK_EDITOR,
        open,
        mode
    };
}

export function setStreetView(panorama) {
    return {
        type: ActionTypes.SET_STREET_VIEW,
        panorama
    };
}

export function setElevationInfoWindow(payload) {
    return {
        type: ActionTypes.SET_ELEVATION_INFO_WINDOW,
        payload
    };
}

export function setCenter(center) {
    return {
        type: ActionTypes.SET_CENTER,
        center,
    };
}

export function setGeoMarker(payload, updateCenter) {
    return {
        type: ActionTypes.SET_GEO_MARKER,
        payload, updateCenter
    };
}

export function setZoom(zoom) {
    return {
        type: ActionTypes.SET_ZOOM,
        zoom,
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

export function openSnackbar(message, askAppend) {
    return {
        type: ActionTypes.OPEN_SNACKBAR,
        message, askAppend
    };
}

export function setLastQuery(lastQuery) {
    return {
        type: ActionTypes.SET_LAST_QUERY,
        lastQuery,
    };
}

export function setAdjacentItemIds(nextId, prevId) {
    return {
        type: ActionTypes.SET_ADJACENT_ITEM_IDS,
        nextId, prevId
    };
}

export function setMapLoaded() {
    return {
        type: ActionTypes.SET_MAP_LOADED,
    };
}
