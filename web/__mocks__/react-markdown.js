import React from 'react'

// react-markdownのモック
const ReactMarkdown = ({ children }) => {
  return React.createElement('div', { 'data-testid': 'react-markdown' }, children)
}

export default ReactMarkdown