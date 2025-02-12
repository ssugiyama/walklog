import React from 'react';
import {
    createRouterReducer, ROUTER_ON_LOCATION_CHANGED, createRouterMiddleware, push,
} from '@lagunovsky/redux-react-router';
import { matchRoutes } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { createTheme } from '@mui/material/styles';
import createCache from '@emotion/cache';
import * as colors from '@mui/material/colors';
import config from 'react-global-configuration';
import searchFormReducer, { setSearchForm, defaultFormValues } from './features/search-form';
import mapReducer, { setSelectedPath } from './features/map';
import miscReducer from './features/misc';
import panoramaReducer from './features/panorama';
import viewReducer from './features/view';
import apiReducer, {
    search, getItem, setSelectedItem, setAdjacentItemIds, setLastQuery,
} from './features/api';
import SearchBox from './components/search-box';
import ItemBox from './components/item-box';

export async function handleRoute(
    itemId,
    query,
    isPathSelected,
    rows,
    queryChanged,
    next,
    searchFunc,
) {
    if (itemId) {
        if (!query.reload) {
            const index = rows.findIndex((row) => row.id.toString() === itemId);
            if (index >= 0) {
                const nextId = index > 0 ? rows[index - 1].id : null;
                const prevId = index < rows.length - 1 ? rows[index + 1].id : null;
                next(setAdjacentItemIds({ nextId, prevId }));
                const item = rows[index];
                next(setSelectedItem({ item, index }));
                return;
            }
        }
        next(getItem({ id: itemId, draft: query.draft, func: searchFunc }));
        return;
    }
    next(setSelectedItem({ item: null, index: -1 }));
    if (!queryChanged) return;
    delete query.reload;
    const lastQuery = { ...query };
    delete lastQuery.offset;
    delete lastQuery.select_first;
    next(setLastQuery(lastQuery));
    const numberForms = ['radius', 'latitude', 'longitude'];
    const searchForm = { ...defaultFormValues, ...query };
    numberForms.forEach((p) => {
        searchForm[p] = Number(searchForm[p]);
    });
    if ((searchForm.filter === 'crossing' || searchForm.filter === 'hausdorff' || searchForm.filter === 'frechet') && !isPathSelected && searchForm.searchPath) {
        next(setSelectedPath(searchForm.searchPath));
    }
    next(setSearchForm(searchForm));
    next(search({ props: searchForm, func: searchFunc }));
}

const formWatchMiddleware = (store) => (next) => (action) => {
    let payload;
    if (action.type === 'searchForm/setSearchForm') {
        payload = action.payload;
    } else if (action.type === 'map/setSelectedPath') {
        payload = { searchPath: action.path };
    } else {
        return next(action);
    }
    const state = store.getState();
    const keys = ['filter', 'user', 'year', 'month', 'order', 'limit', 'draft'];
    const currentFilter = payload.filter !== undefined ? payload.filter : state.searchForm.filter;
    switch (currentFilter) {
    case 'neighborhood':
    case 'start':
    case 'end':
        keys.push('radius', 'longitude', 'latitude');
        break;
    case 'cities':
        keys.push('cities');
        break;
    case 'crossing':
    case 'hausdorff':
    case 'frechet':
        keys.push('searchPath');
        break;
    default:
        // do nothing
    }
    if (!keys.every((key) => payload[key] === undefined ||
        payload[key] === state.searchForm[key])) {
        const q = { ...state.searchForm, ...payload };
        const query = {};
        keys.forEach((key) => { query[key] = q[key] || ''; });
        if (payload.filter &&
            ['neighborhood', 'start', 'end'].includes(currentFilter) &&
            state.map.center) {
            query.latitude ||= state.map.center.lat;
            query.longitude ||= state.map.center.lng;
        }
        if (currentFilter === 'frechet' ||
            (currentFilter === 'hausdorff' && state.searchForm.order !== 'nearest_first')) {
            query.order = 'nearest_first';
        } else if (currentFilter !== 'frechet' &&
            currentFilter !== 'hausdorff' &&
            state.searchForm.order === 'nearest_first') {
            query.order = 'newest_first';
        }
        if (['crossing', 'hausdorff', 'frechet'].includes(currentFilter) && action.type !== 'map/setSelectedPath') {
            query.searchPath = state.map.selectedPath || '';
        }
        const usp = keys.map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`).join('&');
        next(push({
            pathname: '/',
            search: usp,
        }));
    }
    return next(action);
};

export const routes = () => [
    {
        path: `${config.get('itemPrefix')}:id`,
        element: <ItemBox />,
    },
    {
        path: '/',
        element: <SearchBox />,
    },
];

let isFirstLocation = true;
const dataFetchMiddleware = (store) => (next) => (action) => {
    if (action.type === ROUTER_ON_LOCATION_CHANGED) {
        const usp = new URLSearchParams(action.payload.location.search);
        const query = {};
        usp.forEach((value, key) => {
            query[key] = value;
        });
        if (!isFirstLocation) {
            const branch = matchRoutes(routes(), action.payload.location.pathname);
            const match = branch[branch.length - 1];
            const state = store.getState();
            const qsearch = action.payload.location.search &&
                action.payload.location.search.slice(1);
            const queryChanged = state.api.needsReload || (qsearch !== state.api.lastQuery);
            handleRoute(
                match.params.id,
                query,
                state.map.selectedPath,
                state.api.result.rows,
                queryChanged,
                next,
            );
        }
        isFirstLocation = false;
    }
    return next(action);
};

export function configureReduxStore(state, history) {
    const reducers = {
        searchForm: searchFormReducer,
        map: mapReducer,
        misc: miscReducer,
        panorama: panoramaReducer,
        view: viewReducer,
        api: apiReducer,
        router: createRouterReducer(history),
    };
    const middlewares = [
        formWatchMiddleware,
        createRouterMiddleware(history),
        dataFetchMiddleware,
    ];

    return configureStore({
        reducer: reducers,
        middleware: (getDefaultMiddleware) => getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: ['misc/setCurrentUser'],
            },
        }).prepend(middlewares),
        devTools: (process.env.NODE_ENV !== 'production'),
        ...(state && { preloadedState: state }),
    });
}

export const createMuiTheme = (mode = 'light') => {
    const makeColorObject = (color) => colors[color] || { main: color };
    const themeProps = {
        palette: {
            mode,
        },
    };
    const themePrimary = (mode === 'dark' && config.get('darkThemePrimary')) || config.get('themePrimary');
    const themeSecondary = (mode === 'dark' && config.get('darkThemeSecondary')) || config.get('themeSecondary');
    if (themePrimary) {
        themeProps.palette.primary = makeColorObject(themePrimary);
    }
    if (themeSecondary) {
        themeProps.palette.secondary = makeColorObject(themeSecondary);
    }
    return createTheme(themeProps);
};

export const createEmotionCache = () => createCache({ key: 'css' });
