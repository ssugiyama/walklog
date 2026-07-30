import Box from '@mui/material/Box'
import React from 'react'

const ContentBox = (props) => (
  <Box data-testid="ContentBox" {...props}>
    <Box sx={{ paddingBottom: 5, mx: 'auto' }}></Box>
  </Box>
)

export default ContentBox
