import React, { Component, PropTypes } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Link } from 'react-router';
import { push } from 'react-router-redux'
import { setComponentProcs, setAdditionalView, setSelectedIndex, setSelectedItem } from './actions';
import marked from 'marked';

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
    render() {
	let data = this.props.selected_item;
	if (! data) return null;
	let title = `${data.date} : ${data.title} (${data.length.toFixed(1)} km)`;
	let createMarkup = () => { return { __html: marked(data.comment) } };
	let href = location.protocol + "//" + location.host + "/?id=" + data.id;
	let body = data.date + ': ' + data.title + ' (' + data.length.toFixed(1)  + 'km)'; 
	let detail = body;
	if (data.comment) {
	    detail += ' "' +data.comment.replace(/[\n\r]/g, '').substring(0, 40) + '……"';
	}
	return (
	    <div id="comment-box">
            <div className="control">
			<button className="btn btn-sm" disabled={this.props.selected_index <= 0} onClick={this.traverseItem.bind(this, -1)}><span className="glyphicon glyphicon-arrow-left"></span></button>
            <button className="btn btn-sm" disabled={this.props.selected_index >= this.props.rows.length - 1 || this.props.selected_index == -1} onClick={this.traverseItem.bind(this, 1)}><span className="glyphicon glyphicon-arrow-right"></span></button>
		    </div>
                    <button className="close" onClick={this.handleClose.bind(this)}>&times;</button>
		    <div className="body">
			<button onClick={this.handleEdit.bind(this)} className="btn btn-xs btn-danger editButton" aria-hidden="true" type="button"><span className="glyphicon glyphicon-pencil"></span></button>
	    <div ref="twitter" className="twitter_div"></div>	    
		<h2 className="h5"><Link to={'/?id=' + data.id}>{title}</Link></h2>
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
    return bindActionCreators({ push, setComponentProcs, setAdditionalView, setSelectedItem, setSelectedIndex }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(CommentBox);
