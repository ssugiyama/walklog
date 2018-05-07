import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { push } from 'react-router-redux';
import { setSelectedItem, getMoreItems, openWalkEditor } from './actions';
import marked from 'marked';
import IconButton from 'material-ui/IconButton';
import NavigationArrowForward from '@material-ui/icons/ArrowForward';
import NavigationArrowBack from '@material-ui/icons/ArrowBack';
import ArrowUpward from '@material-ui/icons/ArrowUpward';
import EditorModeEdit from '@material-ui/icons/ModeEdit';
import Typography from 'material-ui/Typography';
import ExpansionPanel, {
    ExpansionPanelSummary,
    ExpansionPanelDetails,
} from 'material-ui/ExpansionPanel';
import ElevationBox from './elevation-box';
import PanoramaBox from './panorama-box';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { withStyles } from 'material-ui/styles';
import Button from 'material-ui/Button';
import TweetIcon from './tweet-icon';
import config from './config';

const styles = {
    ExpansionPanelDetails: {
        padding: '8px 12px 12px',
        flexDirection: 'column',
    },
    itemBoxTitle: {
        fontSize: '90%'
    },
    itemBoxAuthor: {
        fontSize: '85%',
        textAlign: 'right',
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
    twitter: {
        display: 'inline-block',
        marginLeft: 20
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
    componentWillMount() {
        this.prepareTwitter(this.props);
    }
    componentWillReceiveProps(nextProps) {
        this.prepareTwitter(nextProps);
    }
    shouldComponentUpdate(nextProps, nextState) {
        if (nextProps.selected_item != this.props.selected_item) return true;
        return false;
    }
    render() {
        const data = this.props.selected_item;
        let title, createMarkup, data_user;
        if (data) {
            title = `${data.date} : ${data.title} (${data.length.toFixed(1)} km)`;
            createMarkup = () => { return { __html: marked(data.comment || '') }; };
            for (let u of this.props.users) {
                if (u.id == data.user_id) data_user = u;
            }
        }
        const upUrl = this.props.last_query ? '/?' + this.props.last_query : '/';
        const index = this.props.selected_index;
        const nextId = this.props.next_id || (index > 0 ? this.props.rows[index-1].id : null);
        const nextUrl = nextId && '/' + nextId;
        const prevId = this.props.prev_id || (index < this.props.rows.length-1 ? this.props.rows[index+1].id : null);
        const prevUrl = prevId ? '/' + prevId : this.props.params ? '/?select=1&' + this.props.params: null;
        const { classes } = this.props;
        return  <div>
                    <div style={styles.itemBoxControl}>
                        <IconButton disabled={!nextUrl} component={Link} to={nextUrl || ''}><NavigationArrowBack /></IconButton>
                        <IconButton component={Link} to={upUrl}><ArrowUpward /></IconButton>
                        <IconButton disabled={!prevUrl} component={Link} to={prevUrl || ''}><NavigationArrowForward /></IconButton>
                        {
                            data && this.props.current_user && data.user_id && this.props.current_user.id == data.user_id ? (<IconButton onClick={this.handleEdit.bind(this)} ><EditorModeEdit /></IconButton>) : null
                        }
                        <IconButton component="a" href={this.state.tweet_url}><TweetIcon /></IconButton>
                        <h4 style={styles.itemBoxTitle}>{ title || 'not found'}</h4>
                        {
                            data_user ? (<div style={styles.itemBoxAuthor}><img style={styles.itemBoxAuthorPhoto} src={data_user.photo} /><span>{data_user.username}</span></div>) : null
                        }
                    </div>
                    { data && 
                        <ExpansionPanel defaultExpanded={true}>
                            <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subheading">Comment</Typography>
                            </ExpansionPanelSummary>
                            <ExpansionPanelDetails className={classes.ExpansionPanelDetails}>
                                <div style={styles.itemBoxText} dangerouslySetInnerHTML={createMarkup()}>
                                </div>
                            </ExpansionPanelDetails>
                        </ExpansionPanel> 
                    }
                    { data && 
                        <ExpansionPanel>
                            <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subheading">Elevation</Typography>
                            </ExpansionPanelSummary>
                            <ExpansionPanelDetails className={classes.ExpansionPanelDetails}>
                                <ElevationBox />
                            </ExpansionPanelDetails>
                        </ExpansionPanel>
                    }
                    { data && 
                        <ExpansionPanel>
                            <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subheading">StreetView</Typography>
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
        params: state.main.result.params,
        next_id: state.main.next_id,
        prev_id: state.main.prev_id,
        current_user: state.main.current_user,
        last_query: state.main.last_query,
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ push, setSelectedItem, getMoreItems, openWalkEditor }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(ItemBox));
