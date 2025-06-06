import React from 'react'
import Box from '@mui/material/Box'

const ContentBox = (props) => (
  <Box
    data-testid="ContentBox"
    {...props}
  >
    <Box paddingBottom={5} mx="auto">
    </Box>
  </Box>
)

export default ContentBox
