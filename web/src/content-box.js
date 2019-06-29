import React from 'react';
import { renderRoutes } from 'react-router-config';
import { routes } from './app';
import Box from '@material-ui/core/Box';

const ContentBox = props => {
    return (
        <Box
            m={1}
            {...props}
        >
            { renderRoutes(routes) }
        </Box>
    );
};

export default ContentBox;
