import React, { Component, PropTypes } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { push } from 'react-router-redux'
import { setComponentProcs, setSelectedItem } from './actions';

class WalkEditor extends Component {
    constructor(props) {
	super(props);
	this.state = {id: '', date: '', title: '', comment: ''};
    }
    componentDidMount() {
	let openWalkEditor = item => {
	    let path = this.props.path_manager.getEncodedSelection();
	    let update_path = this.props.update_path;
	    if (path == null && this.state.id == '') {
		alert('draw or select a path on map');
		return;
	    }
	    else if (path == null) {
		update_path = false;
	    }
	    let state = Object.assign({}, item, {path, update_path});
	    this.setState(state);	    
	    $(this.refs.root).modal('show');
	};
	this.props.setComponentProcs({openWalkEditor});
    }
    handleSubmit(ev) {
	ev.preventDefault();
	let keys = ['date', 'title', 'comment'];
	
	if (! this.state.id || this.state.update_path) {
	    keys.push('path');
	}
	if (this.state.id) {
	    keys.push('id');
	}
    
	let params = keys.map(key => `${key}=${encodeURIComponent(this.state[key])}`).join('&');	
        fetch('/save', {
	    method: 'POST',
	    headers: {
		'Content-Type': 'application/x-www-form-urlencoded',
	    },
	    body: params
	})
	    .then(response => response.json())
	    .then(json => {
		$(this.refs.root).modal('hide');
		let query = { id: json[0].id };
		this.props.push( {query} );
	    })
	    .catch(ex => alert(ex))
    }
    handleDelete(e) {
	e.preventDefault();
	if (confirm('Are you sure to delete?')) {
            fetch('/destroy/' + this.state.id)
		.then(() => {
                    $(this.refs.root).modal('hide');
                    this.props.setSelectedItem(null);		    
		    let query = { id: this.state.id };
		    this.props.push( {query} );
                })
		.catch(ex => alert(ex));
	}
    }
    handleChange(e) {
        this.setState({[e.target.name]: e.target.name == 'update_path' ? e.target.checked : e.target.value});
    }
    render() {
	return (
	    <div className="modal fade" id="walk-editor" ref="root">
	    <div className="modal-dialog">
	    <div className="modal-content">
	    <div className="modal-header">
	    <button type="button" className="close" data-dismiss="modal" aria-hidden="true">&times;</button>
	    <h4 className="modal-title">{ this.state.id ? 'Update Walk' : 'New Walk' }</h4>
	    </div>
	    <form onSubmit={this.handleSubmit.bind(this)} className="form-horizontal" role="form" ref="form">
	    <div className="modal-body">
	    <div className="form-group">
	    <label className="control-label col-xs-3" htmlFor="date">date</label>
	    <div className="col-xs-9">
		<input type="text" name="date" value={this.state.date} onChange={this.handleChange.bind(this)} className="form-control" />
	    </div>
	    </div>
	    <div className="form-group">
	    <label className="control-label col-xs-3" htmlFor="title">title</label>
	    <div className="col-xs-9">
	    <input type="text" name="title" value={this.state.title} onChange={this.handleChange.bind(this)} className="form-control" />
	    </div>
	    </div>
	    <div className="form-group">
	    <label className="control-label col-xs-3" htmlFor="comment">comment<br />(markdown)</label>
	    <div className="col-xs-9">
	    <textarea name="comment" value={this.state.comment} onChange={this.handleChange.bind(this)} className="form-control" ></textarea>
	    </div>
	    </div>
	    {
		this.state.id ?	    
		<div className="form-group">
		<div className="col-xs-9 col-xs-offset-3">
		    <input type="checkbox"  id="update_path" name="update_path" onChange={this.handleChange.bind(this)}  className="form-inline-control" checked={this.state.update_path} disabled={this.state.path == null} />
		<label className="control-label" htmlFor="update_path">update path?</label>
		</div>
		</div> : null
	    }
	    </div>
	    <div  className="modal-footer">
	    <button type="submit" className="btn btn-primary"><span className="glyphicon glyphicon-record"></span>{ this.state.id ? 'update' : 'create' }</button>
	    {
		this.state.id ?
		(<button className="btn btn-danger" onClick={this.handleDelete.bind(this)}><span className="glyphicon glyphicon-remove"></span>delete</button>) : null
	    }
	    </div>
	    </form>
	    </div>
	    </div>
	    </div>
	);
    }
}

function mapStateToProps(state) {
    return { path_manager: state.main.path_manager };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ push, setComponentProcs, setSelectedItem }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(WalkEditor);
