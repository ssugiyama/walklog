import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
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

const styles = {
    ExpansionPanelDetails: {
        padding: '8px 12px 12px',
        flexDirection: 'column',
    },
    commentBoxTitle: {
        fontSize: '90%'
    },
    commentBoxAuthor: {
        fontSize: '85%',
        textAlign: 'right',
    },
    commentBoxAuthorPhoto: {
        width: '16px',
    },        
    commentBoxText: {
        textIndent: '1.2em',
        fontSize: '85%',
        lineHeight: '1.65',
        letterSpacing: '.1em',
        textAlign: 'justify'
    },
    commentBoxControl: {
        width: '100%',
        textAlign: 'center',
        padding: '8px 12px 12px'
    },    
    twitter: {
        display: 'inline-block',
        marginLeft: 20
    },
};

class CommentBox extends Component {
    handleEdit() {
        this.props.openWalkEditor(true, 'update');
    }
    prepareTwitter() {
        const data = this.props.selected_item;
        if (! data) return;
        const href = location.protocol + '//' + location.host + '/' + data.id;
        const body = data.date + ': ' + data.title + ' (' + data.length.toFixed(1)  + 'km)';
        this.refs.twitter.innerHTML = `<a href="https://twitter.com/share" ref="twitter_button" class="twitter-share-button" data-lang="en"  data-size="small" data-hashtags="walklog" data-text='${body}' data-url="${href}" >Tweet</a>`;
        if (window.twttr.widgets) window.twttr.widgets.load();
    }
    shouldComponentUpdate(nextProps, nextState) {
        if (nextProps.selected_item != this.props.selected_item) return true;
        return false;
    }
    componentDidMount() {
        this.prepareTwitter();
    }
    componentDidUpdate() {
        this.prepareTwitter();
    }
    traverseItem(delta) {
        const index = this.props.selected_index + delta;
        if (this.props.next_id && delta < 0) {
            this.props.push('/' + this.props.next_id);
        } else if (this.props.prev_id && delta > 0) {
            this.props.push('/' + this.props.prev_id);
        } else if (index >= this.props.rows.length) {
            this.props.getMoreItems(this.props.params, 'first');
        }
        else {
            this.props.push('/' + this.props.rows[index].id);
        }
    }
    goToSearch() {
        const query = this.props.last_query;
        this.props.push({ pathname: '/', query: query || null });
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
        const { classes } = this.props;
        return  <div>
                    <div style={styles.commentBoxControl}>
                        <IconButton disabled={!this.props.next_id && this.props.selected_index <= 0} onClick={this.traverseItem.bind(this, -1)}><NavigationArrowBack /></IconButton>
                        <IconButton onClick={this.goToSearch.bind(this)}><ArrowUpward /></IconButton>
                        <IconButton disabled={!this.props.prev_id && this.props.selected_index >= this.props.count - 1} onClick={this.traverseItem.bind(this, 1)}><NavigationArrowForward /></IconButton>
                        {
                            data && this.props.current_user && data.user_id && this.props.current_user.id == data.user_id ? (<IconButton onClick={this.handleEdit.bind(this)} ><EditorModeEdit /></IconButton>) : null
                        }
                        { data && <div ref="twitter" style={styles.twitter}></div>}
                        <h4 style={styles.commentBoxTitle}>{ title || 'not found'}</h4>
                        {
                            data_user ? (<div style={styles.commentBoxAuthor}><img style={styles.commentBoxAuthorPhoto} src={data_user.photo} /><span>{data_user.username}</span></div>) : null
                        }
                    </div>
                    { data && 
                        <ExpansionPanel defaultExpanded={true}>
                            <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subheading">Comment</Typography>
                            </ExpansionPanelSummary>
                            <ExpansionPanelDetails className={classes.ExpansionPanelDetails}>
                                <div style={styles.commentBoxText} dangerouslySetInnerHTML={createMarkup()}>
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
        next_id: state.main.result.next_id,
        prev_id: state.main.result.prev_id,
        current_user: state.main.current_user,
        last_query: state.main.last_query,
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ push, setSelectedItem, getMoreItems, openWalkEditor }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(CommentBox));
