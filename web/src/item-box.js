import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { push } from 'connected-react-router';
import { setSelectedItem, getMoreItems, openWalkEditor } from './actions';
import marked from 'marked';
import Paper from '@material-ui/core/Paper';
import IconButton from '@material-ui/core/IconButton';
import NavigationArrowForward from '@material-ui/icons/ArrowForward';
import NavigationArrowBack from '@material-ui/icons/ArrowBack';
import ArrowUpward from '@material-ui/icons/ArrowUpward';
import EditorModeEdit from '@material-ui/icons/Edit';
import Typography from '@material-ui/core/Typography';
import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import ElevationBox from './elevation-box';
import PanoramaBox from './panorama-box';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { withStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import TweetIcon from './tweet-icon';
import config from './config';

const styles = {
    ExpansionPanelDetails: {
        padding: '8px 12px 12px',
        flexDirection: 'column',
    },
    itemBoxTitle: {
        fontSize: '100%'
    },
    itemBoxAuthorPhoto: {
        width: '16px',
    },        
    itemBoxText: {
        textIndent: '1.2em',
        fontSize: '85%',
        lineHeight: '1.65',
        letterSpacing: '.1em',
        textAlign: 'justify'
    },
    itemBoxControl: {
        width: '100%',
        textAlign: 'center',
        padding: '8px 12px 12px'
    },
};

class ItemBox extends Component {
    constructor(props) {
        super(props);
        this.state = { };
    }
    handleEdit() {
        this.props.openWalkEditor(true, 'update');
    }
    prepareTwitter(props) {
        const data = props.selected_item;
        if (! data) return;
        const href = config.base_url + '/' + data.id;
        const text = encodeURIComponent(data.date + ': ' + data.title + ' (' + data.length.toFixed(1)  + 'km)');
        this.setState({
            tweet_url: `https://twitter.com/intent/tweet?hashtags=walklog&text=${text}&url=${href}`,
        });
    }
    componentDidUpdate(prevProps, prevState) {
        this.prepareTwitter(this.props);
    }
    shouldComponentUpdate(nextProps, nextState) {
        if (nextProps.selected_item != this.props.selected_item) return true;
        return false;
    }
    componentDidMount() {
        this.prepareTwitter(this.props);
        this.refs.box_root.parentNode.scrollTop = 0;
    }
    render() {
        const data = this.props.selected_item;
        const {location, last_query, next_id, prev_id, offset, staticContext} = this.props;
        if (staticContext && !data) {
            staticContext.status = 404;
        }
        let title, createMarkup, data_user;
        if (data) {
            title = `${data.date} : ${data.title} (${data.length.toFixed(1)} km)`;
            createMarkup = () => { return { __html: marked(data.comment || '') }; };
            for (let u of this.props.users) {
                if (u.id == data.user_id) data_user = u;
            }
        }
        const upUrl = location && location.search == '?force_fetch=1'
            ? '/' + location.search
            : last_query ? '/?' + last_query : '/';
        const nextUrl = next_id && '/' + next_id;
        const prevUrl = prev_id ? 
            '/' + prev_id : 
            offset > 0 ? 
                '/?select=1&offset=' + offset + 
                    (last_query ? '&' + last_query : '') : null;
        const { classes } = this.props;
        return  <div ref="box_root">
                    <Paper className={classes.itemBoxControl}>
                        <IconButton disabled={!nextUrl} component={Link} to={nextUrl || ''}><NavigationArrowBack /></IconButton>
                        <IconButton color="secondary" component={Link} to={upUrl}><ArrowUpward /></IconButton>
                        <IconButton disabled={!prevUrl} component={Link} to={prevUrl || ''}><NavigationArrowForward /></IconButton>
                        {
                            data && this.props.current_user && data.user_id && this.props.current_user.id == data.user_id ? (<IconButton onClick={this.handleEdit.bind(this)} ><EditorModeEdit /></IconButton>) : null
                        }
                        <IconButton component="a" href={this.state.tweet_url}><TweetIcon /></IconButton>
                        <Typography variant="h6" className={classes.itemBoxTitle}>{ title || 'not found'}</Typography>
                        {
                            data_user ? (<Typography variant="body2" align="right"><img className={classes.itemBoxAuthorPhoto} src={data_user.photo} /><span>{data_user.username}</span></Typography>) : null
                        }
                    </Paper>
                    { data && 
                        <ExpansionPanel defaultExpanded={true}>
                            <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography color="secondary" variant="subtitle1">Comment</Typography>
                            </ExpansionPanelSummary>
                            <ExpansionPanelDetails className={classes.ExpansionPanelDetails}>
                                <div className={classes.itemBoxText} dangerouslySetInnerHTML={createMarkup()}>
                                </div>
                            </ExpansionPanelDetails>
                        </ExpansionPanel> 
                    }
                    { data && 
                        <ExpansionPanel>
                            <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography color="secondary" variant="subtitle1">Elevation</Typography>
                            </ExpansionPanelSummary>
                            <ExpansionPanelDetails className={classes.ExpansionPanelDetails}>
                                <ElevationBox />
                            </ExpansionPanelDetails>
                        </ExpansionPanel>
                    }
                    { data && 
                        <ExpansionPanel>
                            <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography color="secondary" variant="subtitle1">StreetView</Typography>
                            </ExpansionPanelSummary>
                            <ExpansionPanelDetails className={classes.ExpansionPanelDetails}>
                                <PanoramaBox />
                            </ExpansionPanelDetails>
                        </ExpansionPanel>
                    }
            </div>;
    }
}

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
    return bindActionCreators({ push, setSelectedItem, getMoreItems, openWalkEditor }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(ItemBox));
