import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Link } from 'react-router';
import { push } from 'react-router-redux';
import { setTabValue, setSelectedItem, getMoreItems, openWalkEditor } from './actions';
import marked from 'marked';
import IconButton from 'material-ui/IconButton';
import NavigationArrowForward from 'material-ui/svg-icons/navigation/arrow-forward';
import NavigationArrowBack from 'material-ui/svg-icons/navigation/arrow-back';
import ActionHome from 'material-ui/svg-icons/action/home';
import EditorModeEdit from 'material-ui/svg-icons/editor/mode-edit';
import styles from './styles';

class CommentBox extends Component {
    handleEdit() {
        this.props.openWalkEditor(true, 'update');
    }
    prepareTwitter() {
        let data = this.props.selected_item;
        if (! data) return;
        let href = location.protocol + '//' + location.host + '/' + data.id;
        let body = data.date + ': ' + data.title + ' (' + data.length.toFixed(1)  + 'km)';
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
        let index = this.props.selected_index + delta;
        if (index >= this.props.rows.length) {
            this.props.getMoreItems(this.props.params, 'first', index);
        }
        else {
            this.props.setSelectedItem(this.props.rows[index], index);
        }
    }
    goHome() {
        this.props.push({});
        this.props.setTabValue('search');
    }
    render() {
        let data = this.props.selected_item;
        if (! data) return null;
        let title = `${data.date} : ${data.title} (${data.length.toFixed(1)} km)`;
        let createMarkup = () => { return { __html: marked(data.comment || '') }; };
        return (
            <div>
                <div style={styles.commentBoxControl}>
                    <IconButton disabled={this.props.selected_index <= 0} onTouchTap={this.traverseItem.bind(this, -1)}><NavigationArrowBack /></IconButton>
                    <IconButton onTouchTap={this.goHome.bind(this)}><ActionHome /></IconButton>
                    <IconButton disabled={this.props.selected_index >= this.props.count - 1} onTouchTap={this.traverseItem.bind(this, 1)}><NavigationArrowForward /></IconButton>
                    <IconButton onTouchTap={this.handleEdit.bind(this)} ><EditorModeEdit /></IconButton>
                    <div ref="twitter" style={styles.twitter}></div>
                </div>
                <div style={styles.commentBoxBody}>
                    <h4><Link to={'/' + data.id}>{title}</Link></h4>
                    <div  dangerouslySetInnerHTML={createMarkup()} ></div>
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
        count: state.main.result.count,
        params: state.main.result.params,
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ push, setTabValue, setSelectedItem, getMoreItems, openWalkEditor }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(CommentBox);
