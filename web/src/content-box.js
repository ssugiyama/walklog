import React, { memo } from 'react';
import { useSelector } from 'react-redux';
import { makeStyles } from '@material-ui/styles';
import { renderRoutes } from 'react-router-config';
import { routes } from './app';

const styles = () => ({
    root: {
        width: '100%',
    },
    hidden: {
        display: 'none',
    },
});

const useStyles = makeStyles(styles);

const ContentBox = props => {
    const view = useSelector(state => state.main.view);
    const classes = useStyles(props);
    return (
        <div className={view == 'content' ? classes.root: classes.hidden}>
            { renderRoutes(routes) }
        </div>
    );
};

export default memo(ContentBox);
