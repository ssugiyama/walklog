import React from 'react';
import { renderRoutes } from 'react-router-config';
import { routes } from '../app';
import Box from '@mui/material/Box';

const ContentBox = props => {
    return (
        <Box
            m={1}
            data-testid="ContentBox"
            {...props}
        >
            { renderRoutes(routes()) }
        </Box>
    );
};

export default ContentBox;
