import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import { openConfirmModal } from './actions';

class ConfirmModal extends Component {
    handleClick(value) {
        if (this.props.confirm_info.resolve) this.props.confirm_info.resolve(value);
        this.props.openConfirmModal(null);
    }
    render() {
        const info = this.props.confirm_info;
        return info && (
            <Dialog
                open={info != null}
            >
                <DialogTitle>{info.title}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{info.text}</DialogContentText>
                </DialogContent>
                <DialogActions>
                { 
                    info.actions ? info.actions.map( (action, index) =>
                        <Button key={action.value} onClick={this.handleClick.bind(this, action.value)}>{action.label}</Button>
                    ) : null
                }
                </DialogActions>
            </Dialog>
        );
    }
}

function mapStateToProps(state) {
    const {confirm_info} = state.main;
    return { 
        confirm_info
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ openConfirmModal} , dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(ConfirmModal);