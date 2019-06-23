import React, { memo } from 'react';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';

const ConfirmModal = props => {
    const { open, title, resolve, text, actions } = props;
  
    return (
        <Dialog
            open={open}
        >
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <DialogContentText>{text}</DialogContentText>
            </DialogContent>
            <DialogActions>
                { 
                    actions ? actions.map( (action) =>
                        <Button key={action.value} onClick={() => resolve(action.value)}>{action.label}</Button>
                    ) : null
                }
            </DialogActions>
        </Dialog>
    );
};

export default ConfirmModal;