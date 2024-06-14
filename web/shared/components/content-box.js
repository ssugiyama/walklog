import React from 'react';
import { useRoutes } from 'react-router-dom';
import Box from '@mui/material/Box';
import { routes } from '../app';

const Router = () => useRoutes(routes());

const ContentBox = (props) => (
    <Box
        data-testid="ContentBox"
        {...props}
    >
        <Box paddingBottom={5} mx="auto">
            <Router />
        </Box>
    </Box>
);

export default ContentBox;
