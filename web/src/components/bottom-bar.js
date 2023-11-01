import React, { useEffect, useRef, useState, useMemo, useContext, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setSearchForm } from '../features/search-form';
import { setPanoramaIndex } from '../features/panorama';
import { setOverlay } from '../features/view';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import NavigationRefresh from '@mui/icons-material/Block';
import NavigationCancel from '@mui/icons-material/Cancel';
import NavigationArrowForward from '@mui/icons-material/ArrowForward';
import NavigationArrowBack from '@mui/icons-material/ArrowBack';
import AvFastForward from '@mui/icons-material/FastForward';
import AvFastRewind from '@mui/icons-material/FastRewind';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { Link } from 'react-router-dom';
import { idToUrl, getTitles } from '../app';

const BottomBar = (props) => {
    const filter        = useSelector(state => state.searchForm.filter);
    const radius        = useSelector(state => state.searchForm.radius);
    const panoramaIndex = useSelector(state => state.panorama.panoramaIndex);
    const panoramaCount = useSelector(state => state.panorama.panoramaCount);
    const overlay       = useSelector(state => state.view.overlay);
    const mapLoaded     = useSelector(state => state.map.mapLoaded);
    const selectedItem =  useSelector(state => state.api.selectedItem);
    const lastQuery = useSelector(state => state.api.lastQuery);
    const offset = useSelector(state => state.api.result.offset);
    const nextId = useSelector(state => state.api.nextId);
    const prevId = useSelector(state => state.api.prevId);
    const dispatch      = useDispatch();
    const refs = useRef({});

    useEffect(() => {
        if (mapLoaded) {
            refs.current.geocoder = new google.maps.Geocoder();
        }
    }, [mapLoaded]);

    const createPanoramaIndexButtonClickCB = d => () => dispatch(setPanoramaIndex(panoramaIndex + d));
    const panoramaIndexButtonClickCBs = {
        '-10': useCallback(createPanoramaIndexButtonClickCB(-10), [panoramaIndex]),
        '-1':  useCallback(createPanoramaIndexButtonClickCB(-1), [panoramaIndex]),
        '+1':  useCallback(createPanoramaIndexButtonClickCB(1), [panoramaIndex]),
        '+10': useCallback(createPanoramaIndexButtonClickCB(10), [panoramaIndex]),
    };
    const overlayButtonClickCB = useCallback(() => dispatch(setOverlay(false)), []);
    const sxBottomBarGroup = {
        width: '100%',
        margin: 'auto',
    };
    const sxBottomBarGroupBody = {
        width: '100%',
        margin: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    };
    const OverlayControls = (<div key="overlay">
        <Box sx={sxBottomBarGroupBody}>
            <Tooltip title="back to map" position="top-center">
                <IconButton onClick={overlayButtonClickCB} size="large"><NavigationCancel /></IconButton>
            </Tooltip>
            <Tooltip title="-10" position="top-center">
                <IconButton onClick={panoramaIndexButtonClickCBs['-10'] } size="large"><AvFastRewind /></IconButton>
            </Tooltip>
            <Tooltip title="-1" position="top-center">
                <IconButton onClick={panoramaIndexButtonClickCBs['-1']} size="large"><NavigationArrowBack /></IconButton>
            </Tooltip>
            <Typography variant="body1" sx={{display: 'inline'}}>{ panoramaIndex+1 } / { panoramaCount } </Typography>
            <Tooltip title="+1" position="top-center">
                <IconButton onClick={panoramaIndexButtonClickCBs['+1']} size="large"><NavigationArrowForward /></IconButton>
            </Tooltip>
            <Tooltip title="+10" position="top-center">
                <IconButton onClick={panoramaIndexButtonClickCBs['+10']} size="large"><AvFastForward /></IconButton>
            </Tooltip>
        </Box>
    </div>);

    const searchFormChangeCBs = {
        'filter': useCallback(e =>  dispatch(setSearchForm({filter: e.target.value})), []),
        'radius': useCallback(e =>  dispatch(setSearchForm({radius: e.target.value})), []),
        'cities': useCallback(() => dispatch(setSearchForm({cities: ''})), []),
    };
    const FilterControls = (<div key="filter">
        <Box sx={sxBottomBarGroupBody}>
            <Select value={filter} onChange={searchFormChangeCBs['filter']} variant="standard">
                <MenuItem value="">-</MenuItem>
                <MenuItem value="neighborhood">Neighborhood</MenuItem>
                <MenuItem value="cities">Cities</MenuItem>
                <MenuItem value="frechet">Fréchet</MenuItem>
                <MenuItem value="hausdorff">Hausdorff</MenuItem>
                <MenuItem value="crossing">Crossing</MenuItem>
            </Select>
            { filter == 'neighborhood' &&
            <Select value={radius} onChange={searchFormChangeCBs['radius']} variant="standard">
                <MenuItem value={1000}>1km</MenuItem>
                <MenuItem value={500}>500m</MenuItem>
                <MenuItem value={250}>250m</MenuItem>
                <MenuItem value={100}>100m</MenuItem>
                {
                    [1000, 500, 250, 100].some(r => r == radius) ? null
                        : (<MenuItem value={radius}>{Math.round(radius) + 'm'}</MenuItem>)
                }
            </Select>}
            { filter == 'cities' &&
            <Tooltip title="clear" position="top-center">
                <IconButton onClick={searchFormChangeCBs['cities']} size="large"><NavigationRefresh /></IconButton>
            </Tooltip>}
        </Box>
    </div>);

    const draft = selectedItem && selectedItem.draft;
    const [title] = getTitles(selectedItem);
    const nextUrl = nextId && idToUrl(nextId, draft && {draft});
    const prevUrl = prevId ?
        idToUrl(prevId, draft && {draft}) :
        offset > 0 ?
            '/?select=1&offset=' + offset +
                (lastQuery ? '&' + lastQuery : '') : null;
    const ItemControls = (<div key="item">
        <Box sx={sxBottomBarGroupBody}>
            <Tooltip title="mext" position="top-center">
                <IconButton disabled={!nextUrl} component={Link} to={nextUrl || ''} size="large"><NavigationArrowBack /></IconButton>
            </Tooltip>
            <Typography variant="body1" sx={{display: 'inline', flexShrink: 1}} noWrap>{ title }</Typography>
            <Tooltip title="prev" position="top-center">
                <IconButton disabled={!prevUrl} component={Link} to={prevUrl || ''} size="large"><NavigationArrowForward /></IconButton>
            </Tooltip>
        </Box>
    </div>);
    const control = overlay ? OverlayControls : selectedItem ? ItemControls : FilterControls
    return (
        <Toolbar sx={{width: '100%', backgroundColor: 'background.paper'}} data-testid="BottomBar" {...props}>
            <Box sx={sxBottomBarGroup}>
                { control }
            </Box>
        </Toolbar>
    );
};

export default BottomBar;
