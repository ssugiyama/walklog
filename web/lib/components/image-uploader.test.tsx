import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ImageUploader from './image-uploader'

// FileReaderのモック
class MockFileReader {
  result = null
  onload = null
  
  addEventListener = jest.fn((event, handler) => {
    if (event === 'loadend') {
      this.onload = handler
    }
  })
  
  readAsDataURL = jest.fn(() => {
    // 模擬的な画像データURL
    this.result = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8A0XmMwjwyJUJWE'
    
    // 非同期でイベントを発火
    setTimeout(() => {
      if (this.onload) {
        this.onload({ target: { result: this.result } })
      }
    }, 0)
  })
}

// グローバルなFileReaderをモック
global.FileReader = MockFileReader

describe('ImageUploader', () => {
  const defaultProps = {
    name: 'image',
    label: 'Image',
    defaultValue: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders with default props', () => {
    render(<ImageUploader {...defaultProps} />)
    
    expect(screen.getByText('Image')).toBeInTheDocument()
    expect(screen.getByText('select...')).toBeInTheDocument()
    expect(screen.getByText('clear')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'select...' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'clear' })).toBeInTheDocument()
  })

  it('displays image when value is provided', () => {
    const imageUrl = 'https://example.com/image.jpg'
    render(<ImageUploader {...defaultProps} defaultValue={imageUrl} />)
    
    // 背景画像として設定されている画像を確認
    const imageContainer = screen.getByText('Image').nextSibling.firstChild
    expect(imageContainer).toHaveStyle(`background-image: url(${imageUrl})`)
  })

  it('handles file selection', async () => {
    const handleChange = jest.fn()
    render(<ImageUploader {...defaultProps} onChange={handleChange} />)
    
    const selectButton = screen.getByText('select...')
    const fileInput = document.querySelector('input[type="file"]')
    
    // ファイル選択ボタンをクリック
    fireEvent.click(selectButton)
    
    // ファイルを選択
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    })
    
    fireEvent.change(fileInput)
    
    // FileReaderの処理が完了するまで待機
    await waitFor(() => {
      const imageContainer = screen.getByText('Image').nextSibling.firstChild
      expect(imageContainer).toHaveStyle('background-image: url(data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8A0XmMwjwyJUJWE)')
      // triggers clear event
      expect(handleChange).toHaveBeenCalled()
    })
  })

  it('handles clear button click', () => {
    const imageUrl = 'https://example.com/image.jpg'
    const handleClear = jest.fn()
    render(<ImageUploader {...defaultProps} defaultValue={imageUrl} onClear={handleClear} />)
    
    // 最初は画像が表示されている
    let imageContainer = screen.getByText('Image').nextSibling.firstChild
    expect(imageContainer).toHaveStyle(`background-image: url(${imageUrl})`)
    
    // クリアボタンをクリック
    const clearButton = screen.getByText('clear')
    fireEvent.click(clearButton)
    
    // 画像がクリアされている
    imageContainer = screen.getByText('Image').nextSibling.firstChild
    expect(imageContainer).not.toHaveStyle(`background-image: url(${imageUrl})`)
    
    // triggers clear event
    expect(handleClear).toHaveBeenCalled()
  })

  it('updates image when value prop changes', () => {
    const { rerender } = render(<ImageUploader {...defaultProps} defaultValue={null} />)
    
    // 最初は画像なし
    let imageContainer = screen.getByText('Image').nextSibling.firstChild
    expect(imageContainer).not.toHaveStyle('background-image: url(test)')
    
    // 新しい画像URLでre-render
    const newImageUrl = 'https://example.com/new-image.jpg'
    rerender(<ImageUploader {...defaultProps} defaultValue={newImageUrl} />)
    
    // 新しい画像が表示されている
    imageContainer = screen.getByText('Image').nextSibling.firstChild
    expect(imageContainer).toHaveStyle(`background-image: url(${newImageUrl})`)
  })

  it('has correct hidden inputs', () => {
    render(<ImageUploader {...defaultProps} />)
    
    // ファイル入力フィールドが存在する
    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).toHaveAttribute('name', 'image')
    expect(fileInput).toHaveAttribute('type', 'file')
    expect(fileInput).toHaveStyle('display: none')
  })

  it('handles file selection without file', () => {
    render(<ImageUploader {...defaultProps} />)
    
    const fileInput = document.querySelector('input[type="file"]')
    
    // ファイルなしでchangeイベントを発火
    Object.defineProperty(fileInput, 'files', {
      value: [],
      writable: false,
    })
    
    // エラーが発生しないことを確認
    expect(() => {
      fireEvent.change(fileInput)
    }).not.toThrow()
  })
})