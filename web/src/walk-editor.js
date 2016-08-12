import React, { Component, PropTypes } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { push } from 'react-router-redux'
import { setComponentProcs, setSelectedItem } from './actions';
import FlatButton from 'material-ui/FlatButton';
import Dialog from 'material-ui/Dialog';
import DatePicker from 'material-ui/DatePicker';
import TextField from 'material-ui/TextField';
import Toggle from 'material-ui/Toggle';
import IconButton from 'material-ui/IconButton';
import NavigationClose from 'material-ui/svg-icons/navigation/close';
import styles from './styles';

class WalkEditor extends Component {
    constructor(props) {
	super(props);
	this.state = {id: '', date: null, title: '', comment: '', open: false};
    }
    componentDidMount() {
	let openWalkEditor = item => {
	    let path = this.props.path_manager.getEncodedSelection();
	    let update_path = this.props.update_path;
	    let date;
	    if (item.date) {
		date = new Date(item.date);
	    }
	    else {
		date = new Date();
	    }
	    if (path == null && this.state.id == '') {
		alert('draw or select a path on map');
		return;
	    }
	    else if (path == null) {
		update_path = false;
	    }
	    let state = Object.assign({}, item, {path, update_path, open: true, date});
	    this.setState(state);	    
	};
	this.props.setComponentProcs({openWalkEditor});
    }
    handleClose() {
	this.setState({ open: false });
    }
    handleSubmit() {
	function formatDate(d) {
	   return d.getFullYear()+
	    ( "0" + ( d.getMonth()+1 ) ).slice(-2)+
	    ( "0" + d.getDate() ).slice(-2);
	}
	let keys = ['date', 'title', 'comment'];
	
	if (! this.state.id || this.state.update_path) {
	    keys.push('path');
	}
	if (this.state.id) {
	    keys.push('id');
	}
	let state = Object.assign({}, this.state, {date: formatDate(this.state.date)});
	let params = keys.map(key => `${key}=${encodeURIComponent(state[key])}`).join('&');	
        fetch('/save', {
	    method: 'POST',
	    headers: {
		'Content-Type': 'application/x-www-form-urlencoded',
	    },
	    body: params
	})
	    .then(response => response.json())
	    .then(json => {
		let query = { id: json[0].id };
		this.props.push( {query} );
		this.handleClose();		
	    })
	    .catch(ex => alert(ex))
    }
    handleDelete(e) {
	e.preventDefault();
	if (confirm('Are you sure to delete?')) {
            fetch('/destroy/' + this.state.id)
		.then(() => {
                    this.props.setSelectedItem(null);		    
		    let query = { id: this.state.id };
		    this.props.push( {query} );
		    this.handleClose();		    
                })
		.catch(ex => alert(ex));
	}
    }
    handleChange(name, e, value) {
        this.setState({[name]: value !== undefined ? value : e.target.value});
    }
    render() {
	let actions = [];
	actions.push (<FlatButton onTouchTap={this.handleSubmit.bind(this)}  label={ this.state.id ? 'update' : 'create' } primary={true} />);
	if (this.state.id) {
	    actions.push (<FlatButton label="delete" secondary={true} onTouchTap={this.handleDelete.bind(this)}/>);	    
	}
	// due to https://github.com/callemall/material-ui/issues/3394 we use onBlur.	
	return (
	    <Dialog
                title={ this.state.id ? 'Update Walk' : 'New Walk' }
		actions={actions}
		modal={false}
		open={this.state.open}
                onRequestClose={this.handleClose.bind(this)}
            >	    
		<div>
	            <DatePicker value={this.state.date} onChange={this.handleChange.bind(this, 'date')} container="inline" mode="landscape" floatingLabelText='date' floatingLabelFixed={true} fullWidth={true} autoOk={true} />
		</div>
		<div>
  		    <TextField defaultValue={this.state.title} onBlur={this.handleChange.bind(this, 'title')} floatingLabelText="title" floatingLabelFixed={true}  fullWidth={true} />
		</div>
		<div>
   	            <TextField multiLine={true} rows={4} rowsMax={4}
			       defaultValue={this.state.comment} onBlur={this.handleChange.bind(this, 'comment')} floatingLabelText="comment" floatingLabelFixed={true} fullWidth={true} />
		</div>
		{
		this.state.id ?	    
		    <div><Toggle label="update path?" onToggle={this.handleChange.bind(this, 'update_path')}  toggled={this.state.update_path} disabled={this.state.path == null} /></div> : null
		}
		    <IconButton style={styles.dialogCloseButton} onTouchTap={this.handleClose.bind(this)}><NavigationClose /></IconButton>	    
	    </Dialog>
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
