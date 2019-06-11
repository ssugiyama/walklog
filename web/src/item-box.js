import React, { memo, useMemo, useState, useCallback } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { openWalkEditor } from './actions';
import marked from 'marked';
import Paper from '@material-ui/core/Paper';
import IconButton from '@material-ui/core/IconButton';
import Fab from '@material-ui/core/Fab';
import NavigationArrowForwardIcon from '@material-ui/icons/ArrowForward';
import NavigationArrowBackIcon from '@material-ui/icons/ArrowBack';
import ListIcon from '@material-ui/icons/List';
import EditorModeEditIcon from '@material-ui/icons/Edit';
import Typography from '@material-ui/core/Typography';
import ElevationBox from './elevation-box';
import PanoramaBox from './panorama-box';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import { makeStyles } from '@material-ui/styles';
import NoSsr from '@material-ui/core/NoSsr';
import TweetIcon from './tweet-icon';
import SwipeableViews from 'react-swipeable-views';
import config from 'react-global-configuration';

const styles = () => ({
    itemBoxContent: {
        padding: '8px 12px 12px',
        flexDirection: 'column',
        margin: '4px 0',
    },
    tabs: {
        margin: '4px 0',
    },
    tab: {
        textTransform: 'none',
    },
    itemBoxTitle: {
        fontSize: '100%'
    },
    itemBoxAuthorPhoto: {
        width: '16px',
    },        
    itemBoxText: {
        textIndent: '1.2em',
        lineHeight: '1.65',
        letterSpacing: '.1em',
        textAlign: 'justify',
        '& a': {
            color: 'inherit'
        }
    },
    itemBoxImage: {
        float: 'left',
        width: 320,
        margin: '0 20px 20px 0'
    },
    itemBoxControl: {
        width: '100%',
        textAlign: 'center',
        padding: '8px 12px 12px',
        margin: '4px 0',
    },
    backButton: {
        float: 'left',
        marginLeft: 10,
        marginTop: 10,
    },
    '@media (max-width:600px)': {
        itemBoxImage: {
            float: 'none',
            margin: '0 auto 0 auto',
            display: 'inherit'
        },
    }
});

const useStyles = makeStyles(styles);

const ItemBox = props => {
    const [tabValue, setTabValue] = useState(0);
    const { location, lastQuery, nextId, prevId, offset, staticContext, 
        selectedItem, currentUser, users, openWalkEditor} = props;
    const classes = useStyles(props);
    const handleEdit = () => {
        openWalkEditor(true, 'update');
    };
    const handleTabChange = useCallback(tabValue => {
        setTabValue(tabValue);
    });

    const tweetUrl = useMemo(() => {
        const data = selectedItem;
        if (! data) return null;
        const href = config.get('baseUrl') + '/' + data.id;
        const text = encodeURIComponent(data.date + ': ' + data.title + ' (' + data.length.toFixed(1)  + 'km)');
        return `https://twitter.com/intent/tweet?hashtags=walklog&text=${text}&url=${href}`;
    }, [selectedItem]); 
   
    const data = selectedItem;
    
    if (staticContext && !data) {
        staticContext.status = 404;
    }
    let title, createMarkup, dataUser, image;
    if (data) {
        title = `${data.date} : ${data.title} (${data.length.toFixed(1)} km)`;
        createMarkup = () => { return { __html: marked(data.comment || '') }; };
        image = data.image;
        for (let u of users) {
            if (u.id == data.userId) dataUser = u;
        }
    }
    const upUrl = location && location.search == '?forceFetch=1'
        ? '/' + location.search
        : lastQuery ? '/?' + lastQuery : '/';
    const nextUrl = nextId && '/' + nextId;
    const prevUrl = prevId ? 
        '/' + prevId : 
        offset > 0 ? 
            '/?select=1&offset=' + offset + 
                (lastQuery ? '&' + lastQuery : '') : null;
    return  data && 
        (<div>
            <Paper className={classes.itemBoxControl}>
                <Fab className={classes.backButton} size="small" color="primary" component={Link} to={upUrl}><ListIcon /></Fab>
                <IconButton disabled={!nextUrl} component={Link} to={nextUrl || ''}><NavigationArrowBackIcon /></IconButton>
                <IconButton disabled={!prevUrl} component={Link} to={prevUrl || ''}><NavigationArrowForwardIcon /></IconButton>
                {
                    data && currentUser && data.userId && currentUser.id == data.userId ? (<IconButton onClick={handleEdit} ><EditorModeEditIcon /></IconButton>) : null
                }
                <IconButton component="a" href={tweetUrl}><TweetIcon /></IconButton>
                <Typography variant="h6" color={title ? 'default' : 'error'} className={classes.itemBoxTitle}>{ title || 'not found'}</Typography>
                {
                    dataUser ? (<Typography variant="body2" align="right"><img className={classes.itemBoxAuthorPhoto} src={dataUser.photo} /><span>{dataUser.username}</span></Typography>) : null
                }
            </Paper>
            <Paper>
                <Tabs value={tabValue}
                    onChange={(e, value) => handleTabChange(value)}
                    className={classes.tabs}
                    textColor="secondary"
                    variant="fullWidth" >
                    <Tab label="Comment"  className={classes.tab} />
                    <Tab label="Elevation" className={classes.tab} />
                    <Tab label="StreetView" className={classes.tab}/>
                </Tabs>
            </Paper>
            <SwipeableViews index={tabValue} onChangeIndex={index => handleTabChange(index)} disableLazyLoading enableMouseEvents>
                <Paper className={classes.itemBoxContent}>
                    {image && <img src={image} className={classes.itemBoxImage} />}
                    <Typography variant="body2" component="div" className={classes.itemBoxText} dangerouslySetInnerHTML={createMarkup()}>
                    </Typography>
                </Paper>
                <Paper className={classes.itemBoxContent}>
                    <NoSsr>
                        <ElevationBox />
                    </NoSsr>
                </Paper>
                <Paper className={classes.itemBoxContent}>
                    <PanoramaBox />
                </Paper>
            </SwipeableViews>
        </div>);  
};

function mapStateToProps(state) {
    return {
        selectedItem: state.main.selectedItem,
        selectedIndex: state.main.selectedIndex,
        rows: state.main.result.rows,
        users: state.main.users,
        count: state.main.result.count,
        offset: state.main.result.offset,
        nextId: state.main.nextId,
        prevId: state.main.prevId,
        currentUser: state.main.currentUser,
        lastQuery: state.main.lastQuery,
        location: state.router.location,
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ openWalkEditor }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(memo(ItemBox));
