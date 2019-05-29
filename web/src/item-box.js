import React, { memo, useMemo, useState, useCallback } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { openWalkEditor } from './actions';
import marked from 'marked';
import Paper from '@material-ui/core/Paper';
import IconButton from '@material-ui/core/IconButton';
import NavigationArrowForward from '@material-ui/icons/ArrowForward';
import NavigationArrowBack from '@material-ui/icons/ArrowBack';
import ArrowUpward from '@material-ui/icons/ArrowUpward';
import EditorModeEdit from '@material-ui/icons/Edit';
import Typography from '@material-ui/core/Typography';
import ElevationBox from './elevation-box';
import PanoramaBox from './panorama-box';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import { withStyles } from '@material-ui/core/styles';
import NoSsr from '@material-ui/core/NoSsr';
import TweetIcon from './tweet-icon';
import SwipeableViews from 'react-swipeable-views';
import config from 'react-global-configuration';

const styles = theme => ({
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
    '@media (max-width:600px)': {
        itemBoxImage: {
            float: 'none',
            margin: '0 auto 0 auto',
            display: 'inherit'
        },
    }
});

const ItemBox = props => {
    const [tabValue, setTabValue] = useState(0);
    const { openWalkEditor } = props; 
    const {classes, location, last_query, next_id, prev_id, offset, staticContext, 
        selected_item, current_user, users} = props;
    const handleEdit = () => {
        openWalkEditor(true, 'update');
    };
    const handleTabChange = useCallback(tabValue => {
        setTabValue(tabValue);
    });

    const tweetUrl = useMemo(() => {
        const data = selected_item;
        if (! data) return null;
        const href = config.get('base_url') + '/' + data.id;
        const text = encodeURIComponent(data.date + ': ' + data.title + ' (' + data.length.toFixed(1)  + 'km)');
        return `https://twitter.com/intent/tweet?hashtags=walklog&text=${text}&url=${href}`;
    }, [selected_item]); 
   
    const data = selected_item;
    
    if (staticContext && !data) {
        staticContext.status = 404;
    }
    let title, createMarkup, data_user, image;
    if (data) {
        title = `${data.date} : ${data.title} (${data.length.toFixed(1)} km)`;
        createMarkup = () => { return { __html: marked(data.comment || '') }; };
        image = data.image;
        for (let u of users) {
            if (u.id == data.user_id) data_user = u;
        }
    }
    const upUrl = location && location.search == '?force_fetch=1'
        ? '/' + location.search
        : last_query && last_query != 'restore_url=1' ? '/?' + last_query : '/';
    const nextUrl = next_id && '/' + next_id;
    const prevUrl = prev_id ? 
        '/' + prev_id : 
        offset > 0 ? 
            '/?select=1&offset=' + offset + 
                (last_query ? '&' + last_query : '') : null;
    return  data && 
        (<div>
            <Paper className={classes.itemBoxControl}>
                <IconButton disabled={!nextUrl} component={Link} to={nextUrl || ''}><NavigationArrowBack /></IconButton>
                <IconButton color="secondary" component={Link} to={upUrl}><ArrowUpward /></IconButton>
                <IconButton disabled={!prevUrl} component={Link} to={prevUrl || ''}><NavigationArrowForward /></IconButton>
                {
                    data && current_user && data.user_id && current_user.id == data.user_id ? (<IconButton onClick={handleEdit} ><EditorModeEdit /></IconButton>) : null
                }
                <IconButton component="a" href={tweetUrl}><TweetIcon /></IconButton>
                <Typography variant="h6" color={title ? 'default' : 'error'} className={classes.itemBoxTitle}>{ title || 'not found'}</Typography>
                {
                    data_user ? (<Typography variant="body2" align="right"><img className={classes.itemBoxAuthorPhoto} src={data_user.photo} /><span>{data_user.username}</span></Typography>) : null
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
        selected_item: state.main.selected_item,
        selected_index: state.main.selected_index,
        rows: state.main.result.rows,
        users: state.main.users,
        count: state.main.result.count,
        offset: state.main.result.offset,
        next_id: state.main.next_id,
        prev_id: state.main.prev_id,
        current_user: state.main.current_user,
        last_query: state.main.last_query,
        location: state.router.location,
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ openWalkEditor }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(memo(ItemBox)));
