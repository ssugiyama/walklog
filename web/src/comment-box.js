import React, { Component, PropTypes } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Link } from 'react-router';
import { push } from 'react-router-redux'
import { setComponentProcs, setTabValue, setSelectedIndex, setSelectedItem } from './actions';
import marked from 'marked';
import IconButton from 'material-ui/IconButton';
import NavigationArrowForward from 'material-ui/svg-icons/navigation/arrow-forward';
import NavigationArrowBack from 'material-ui/svg-icons/navigation/arrow-back';
import ActionHome from 'material-ui/svg-icons/action/home';
import EditorModeEdit from 'material-ui/svg-icons/editor/mode-edit';
import styles from './styles';

class CommentBox extends Component {
    handleEdit() {
	this.props.openWalkEditor(this.props.selected_item);
    }
    handleClose() {
	this.props.setAdditionalView(null);
    }
    prepareTwitter() {
	let data = this.props.selected_item;
	if (! data) return;
	let href = location.protocol + "//" + location.host + "/?id=" + data.id;
	let body = data.date + ': ' + data.title + ' (' + data.length.toFixed(1)  + 'km)'; 
	let detail = body;
	if (data.comment) {
	    detail += ' "' +data.comment.replace(/[\n\r]/g, '').substring(0, 40) + '……"';
	}
	this.refs.twitter.innerHTML = `<a href="https://twitter.com/share" ref="twitter_button" class="twitter-share-button" data-lang="en"  data-size="small" data-hashtags="walklog" data-text='${detail}' data-url="${href}" >Tweet</a>`;
	if (window.twttr.widgets) window.twttr.widgets.load();
    }
    componentDidMount() {
	this.prepareTwitter();    
    }
    componentDidUpdate() {
	this.prepareTwitter();	
    }
    traverseItem(delta) {
	let index = this.props.selected_index + delta;
	this.props.setSelectedIndex(index);
	this.props.path_manager.showPath(this.props.rows[index].path, true);		
	this.props.setSelectedItem(this.props.rows[index]);
    }
    goHome() {
	this.props.push({});
	this.props.setTabValue('search');
    }
    render() {
	let data = this.props.selected_item;
	if (! data) return null;
	let title = `${data.date} : ${data.title} (${data.length.toFixed(1)} km)`;
	let createMarkup = () => { return { __html: marked(data.comment || '') } };
	let href = location.protocol + "//" + location.host + "/?id=" + data.id;
	let body = data.date + ': ' + data.title + ' (' + data.length.toFixed(1)  + 'km)'; 
	let detail = body;
	if (data.comment) {
	    detail += ' "' +data.comment.replace(/[\n\r]/g, '').substring(0, 40) + '……"';
	}
	return (
	    <div>
		<div style={styles.commentBoxControl}>
		    <IconButton disabled={this.props.selected_index <= 0} onTouchTap={this.traverseItem.bind(this, -1)}><NavigationArrowBack /></IconButton>
		    <IconButton onTouchTap={this.goHome.bind(this)}><ActionHome /></IconButton>				    
		    <IconButton disabled={this.props.selected_index >= this.props.rows.length - 1} onTouchTap={this.traverseItem.bind(this, 1)}><NavigationArrowForward /></IconButton>		
		    <IconButton onTouchTap={this.handleEdit.bind(this)} ><EditorModeEdit /></IconButton>
		    <div ref="twitter" style={styles.twitter}></div>	    
		
		</div>
		<div style={styles.commentBoxBody}>
		    <h4><Link to={'/?id=' + data.id}>{title}</Link></h4>
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
	path_manager: state.main.path_manager,
	openWalkEditor: state.main.component_procs.openWalkEditor,
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ push, setComponentProcs, setTabValue, setSelectedItem, setSelectedIndex }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(CommentBox);
