import React from 'react';
import { useRoutes } from 'react-router-dom';
import { routes } from '../app';
import Box from '@mui/material/Box';

const Router = () => useRoutes(routes());

const ContentBox = props => {
    return (
        <Box
            m={1}
            data-testid="ContentBox"
            {...props}
        >
            <Box  maxWidth={800} paddingBottom={5} mx="auto">
                <Router />
            </Box>
        </Box>
    );
};

export default ContentBox;
