// actions
import * as ActionTypes from './action-types'

export function setSearchForm(payload) {
    return {
	type: ActionTypes.SET_SEARCH_FORM,
	payload
    };
}

function searchStart() {
    return {
	type: ActionTypes.SEARCH_START,
    }
}
function searchResult(data, append) {
    return {
	type: ActionTypes.SEARCH_RESULT,
	data,
	append,
    }
}

export function search(props, show) {
    return dispatch => {
	dispatch(searchStart());
	let keys = ['id', 'date', 'filter', 'year', 'month', 'radius', 'longitude', 'latitude', 'cities', 'searchPath', 'limit', 'order'];
	let params = keys.filter(key => props[key]).map(key => `${key}=${encodeURIComponent(props[key])}`).join('&');
	fetch('/search?' + params)
	    .then(response => response.json())
	    .then(data => {
		dispatch(searchResult(data, false));
		if (show == 'first' && data.rows.length > 0) {
		    dispatch(setSelectedItem(data.rows[0], 0));
		}
		else if (show == 'all') {
		    dispatch(showAllPaths(data.rows));
		}
	    })
	    .catch(ex => alert(ex))
    }
}

export function getMoreItems(params, show, selected_index) {
    return dispatch => {
	fetch('/search?' + params)
	    .then(response => response.json())
	    .then(data => {
		dispatch(searchResult(data, true));
		if (show == 'first' && data.rows.length > 0) {
		    dispatch(setSelectedItem(data.rows[0], selected_index));
		}
	    })
	    .catch(ex => alert(ex))
    }
}

export function setSelectedItem(item, index) {
    return {
	type: ActionTypes.SET_SELECTED_ITEM,
	item,
	index
    }
}

export function setSelectedPath(path) {
    return {
	type: ActionTypes.SET_SELECTED_PATH,
	path
    }
}

export function toggleSidebar() {
    return {
	type: ActionTypes.TOGGLE_SIDEBAR,
    }
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
    }
}

export function openIOModal(open) {
    return {
	type: ActionTypes.OPEN_IO_MODAL,
	open
    }
}

export function openGeocodeModal(open) {
    return {
	type: ActionTypes.OPEN_GEOCODE_MODAL,
	open
    }
}

export function setStreetView(panorama) {
    return {
	type: ActionTypes.SET_STREET_VIEW,
	panorama
    }
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
