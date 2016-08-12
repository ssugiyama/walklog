// actions
import * as ActionTypes from './action-types'

export function setSearchForm(payload) {
    return {
	type: ActionTypes.SET_SEARCH_FORM,
	payload
    };
}

export function setComponentProcs(payload) {
    return {
	type: ActionTypes.SET_COMPONENT_PROCS,
	payload
    };
}

function searchStart(clear) {
    return {
	type: ActionTypes.SEARCH_START,
	clear
    }
}
function searchResult(data, append) {
    return {
	type: ActionTypes.SEARCH_RESULT,
	data,
	append
    }
}

export function search(props) {
    return dispatch => {
	dispatch(searchStart(true));
	let keys = ['id', 'date', 'filter', 'year', 'month', 'radius', 'longitude', 'latitude', 'cities', 'searchPath', 'limit', 'order'];
	let params = keys.filter(key => props[key]).map(key => `${key}=${encodeURIComponent(props[key])}`).join('&');
	fetch('/search?' + params)
	    .then(response => response.json())
	    .then(json => dispatch(searchResult(json, false)))
	    .catch(ex => alert(ex))
    }
}

export function getMoreAction(params) {
    return dispatch => {
	dispatch(searchStart(false));
	fetch('/search?' + params)
	    .then(response => response.json())
	    .then(json => dispatch(searchResult(json, true)))
	    .catch(ex => alert(ex))
    }
}

export function setPathManagerAction(manager) {
    return {
	type: ActionTypes.SET_PATH_MANAGER,
	manager
    }
}

export function setSelectedItem(item) {
    return {
	type: ActionTypes.SET_SELECTED_ITEM,
	item
    }
}

export function setSelectedPath(path) {
    return {
	type: ActionTypes.SET_SELECTED_PATH,
	path
    }
}

export function setSelectedIndex(index) {
    return {
	type: ActionTypes.SET_SELECTED_INDEX,
	index
    }
}

export function showSidebar(open) {
    return {
	type: ActionTypes.SHOW_SIDEBAR,
	open
    }
}

export function finishShowOnMap() {
    return {
	type: ActionTypes.FINISH_SHOW_ON_MAP
    };
}

export function setTabValue(value) {
    return {
	type: ActionTypes.SET_TAB_VALUE,
	value
    };
}
