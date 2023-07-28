import React, { useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { openWalkEditor } from '../features/view';
import { marked } from 'marked';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Fab from '@mui/material/Fab';
import NavigationArrowForwardIcon from '@mui/icons-material/ArrowForward';
import NavigationArrowBackIcon from '@mui/icons-material/ArrowBack';
import ListIcon from '@mui/icons-material/List';
import EditorModeEditIcon from '@mui/icons-material/Edit';
import Typography from '@mui/material/Typography';
import ElevationBox from './elevation-box';
import PanoramaBox from './panorama-box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import NoSsr from '@mui/material/NoSsr';
import SwipeableViews from 'react-swipeable-views';
import config from 'react-global-configuration';

const ItemBox = () => {
    const [tabValue, setTabValue] = useState(0);
    const selectedItem =  useSelector(state => state.api.selectedItem);
    const users = useSelector(state => state.misc.users);
    const offset =  useSelector(state => state.api.result.offset);
    const nextId =  useSelector(state => state.api.nextId);
    const prevId =  useSelector(state => state.api.prevId);
    const currentUser = useSelector(state =>  state.misc.currentUser);
    const lastQuery = useSelector(state => state.api.lastQuery);
    const location =  useSelector(state => state.router.location);
    const dispatch = useDispatch();
    const handleEdit = () => {
        dispatch(openWalkEditor({ open: true, mode: 'update' }));
    };
    const tabChangeCB = useCallback((e, value) => {
        setTabValue(value);
    });
    const indexCHangeCB = useCallback(index => {
        setTabValue(index);
    });

    const data = selectedItem;

    let title, createMarkup, dataUser, image;
    if (data) {
        title = `${data.date} : ${data.title} (${data.length.toFixed(1)} km)`;
        createMarkup = () => { return { __html: marked.parse(data.comment || '') }; };
        image = data.image;
        for (const u of users) {
            if (u.uid == data.uid) dataUser = u;
        }
    }
    const upUrl = location && location.search == '?forceFetch=1'
        ? '/' + location.search
        : lastQuery ? '/?' + lastQuery : '/';
    const nextUrl = nextId && config.get('itemPrefix') + nextId;
    const prevUrl = prevId ?
        config.get('itemPrefix') + prevId :
        offset > 0 ?
            '/?select=1&offset=' + offset +
                (lastQuery ? '&' + lastQuery : '') : null;

    const sxImageBox = {
        float: ['none', 'left'],
        width: 320,
        mu: [0, 2],
        mr: ['auto', 2],
        md: [0, 2],
        ml: ['auto', 0],
        display: ['inherit', 'block'],
    };
    return (
        <Box data-testid="ItemBox">
            <Paper sx={{ width: '100%', textAlign: 'center', padding: 2, }}>
                <Fab sx={{ float: 'left', marginLeft: 1, marginTop: 1, }} size="small" color="primary" component={Link} to={upUrl}><ListIcon /></Fab>
                <IconButton disabled={!nextUrl} component={Link} to={nextUrl || ''} size="large"><NavigationArrowBackIcon /></IconButton>
                <IconButton disabled={!prevUrl} component={Link} to={prevUrl || ''} size="large"><NavigationArrowForwardIcon /></IconButton>
                {
                    data && currentUser && data.uid && currentUser.uid == data.uid ? (<IconButton onClick={handleEdit} size="large"><EditorModeEditIcon /></IconButton>) : null
                }
                <Typography variant="h6" sx={{ fontSize: '100%' }}>{ title || 'not found'}</Typography>
                {
                    dataUser ? (<Typography variant="body2" align="right"><Box component="img" sx={{ width: 16,}} src={dataUser.photoURL} /><span>{dataUser.displayName}</span></Typography>) : null
                }
            </Paper>
            { data &&
                <Paper>
                    <Tabs value={tabValue}
                        onChange={tabChangeCB}
                        sx={{ margin: '4px 0' }}
                        textColor="secondary"
                        variant="fullWidth" >
                        <Tab label="Comment"  sx={{ textTransform: 'none', }} />
                        <Tab label="Elevation" sx={{ textTransform: 'none', }}/>
                        <Tab label="StreetView" sx={{ textTransform: 'none', }}/>
                    </Tabs>
                </Paper>
            }
            { data &&
                <SwipeableViews index={tabValue} onChangeIndex={indexCHangeCB} disableLazyLoading>
                    <Paper sx={{ flexDirection: 'column', padding: 2, }}>
                        {image &&
                            <Box sx={sxImageBox} component="img" src={image} />}
                        <Typography variant="body2" component="div"
                            sx={{
                                textIndent: '1.2em',
                                lineHeight: '1.65',
                                letterSpacing: '.1em',
                                textAlign: 'justify',
                                '& a': {
                                    color: 'inherit'
                                }
                            }}
                            dangerouslySetInnerHTML={createMarkup()}>
                        </Typography>
                    </Paper>
                    <Paper sx={{ flexDirection: 'column', padding: 2, padding: 2, }}>
                        <NoSsr>
                            <ElevationBox />
                        </NoSsr>
                    </Paper>
                    <Paper sx={{ flexDirection: 'column', padding: 2, }}>
                        <PanoramaBox />
                    </Paper>
                </SwipeableViews>
            }
        </Box>
    );
};

export default ItemBox;
