import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import { setTabValue, setSelectedItem, getMoreItems, openWalkEditor } from './actions';
import marked from 'marked';
import IconButton from 'material-ui/IconButton';
import NavigationArrowForward from '@material-ui/icons/ArrowForward';
import NavigationArrowBack from '@material-ui/icons/ArrowBack';
import EditorModeEdit from '@material-ui/icons/ModeEdit';
import Typography from 'material-ui/Typography';

const styles = {
    commentBoxBody: {
        padding: '10px 20px',
        textAlign: 'justify'
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
    },
    commentBoxControl: {
        width: '100%',
        textAlign: 'center'
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
    render() {
        const data = this.props.selected_item;
        if (! data) return null;
        const title = `${data.date} : ${data.title} (${data.length.toFixed(1)} km)`;
        const createMarkup = () => { return { __html: marked(data.comment || '') }; };
        let data_user;
        for (let u of this.props.users) {
            if (u.id == data.user_id) data_user = u;
        }
        return (
            <div>
                <div style={styles.commentBoxControl}>
                    <IconButton disabled={!this.props.next_id && this.props.selected_index <= 0} onClick={this.traverseItem.bind(this, -1)}><NavigationArrowBack /></IconButton>
                    <IconButton disabled={!this.props.prev_id && this.props.selected_index >= this.props.count - 1} onClick={this.traverseItem.bind(this, 1)}><NavigationArrowForward /></IconButton>
                    {
                        this.props.current_user && data.user_id && this.props.current_user.id == data.user_id ? (<IconButton onClick={this.handleEdit.bind(this)} ><EditorModeEdit /></IconButton>) : null
                    }
                    <div ref="twitter" style={styles.twitter}></div>
                </div>
                <div style={styles.commentBoxBody}>
                    <Typography variant="subheading">{title}</Typography>
                    {
                        data_user ? (<div style={styles.commentBoxAuthor}><img style={styles.commentBoxAuthorPhoto} src={data_user.photo} /><span>{data_user.username}</span></div>) : null
                    }
                    <div style={styles.commentBoxText} dangerouslySetInnerHTML={createMarkup()} ></div>
                </div>
            </div>
        );
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
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ push, setTabValue, setSelectedItem, getMoreItems, openWalkEditor }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(CommentBox);
