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
    nameForDeletion: 'will_delete_image',
    label: 'Image',
    value: null,
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
    render(<ImageUploader {...defaultProps} value={imageUrl} />)
    
    // 背景画像として設定されている画像を確認
    const imageContainer = screen.getByText('Image').nextSibling.firstChild
    expect(imageContainer).toHaveStyle(`background-image: url(${imageUrl})`)
  })

  it('handles file selection', async () => {
    render(<ImageUploader {...defaultProps} />)
    
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
    })
  })

  it('handles clear button click', () => {
    const imageUrl = 'https://example.com/image.jpg'
    render(<ImageUploader {...defaultProps} value={imageUrl} />)
    
    // 最初は画像が表示されている
    let imageContainer = screen.getByText('Image').nextSibling.firstChild
    expect(imageContainer).toHaveStyle(`background-image: url(${imageUrl})`)
    
    // クリアボタンをクリック
    const clearButton = screen.getByText('clear')
    fireEvent.click(clearButton)
    
    // 画像がクリアされている
    imageContainer = screen.getByText('Image').nextSibling.firstChild
    expect(imageContainer).not.toHaveStyle(`background-image: url(${imageUrl})`)
    
    // 削除フラグが設定されている
    const hiddenInput = screen.getByDisplayValue('true')
    expect(hiddenInput).toHaveAttribute('name', 'will_delete_image')
  })

  it('updates image when value prop changes', () => {
    const { rerender } = render(<ImageUploader {...defaultProps} value={null} />)
    
    // 最初は画像なし
    let imageContainer = screen.getByText('Image').nextSibling.firstChild
    expect(imageContainer).not.toHaveStyle('background-image: url(test)')
    
    // 新しい画像URLでre-render
    const newImageUrl = 'https://example.com/new-image.jpg'
    rerender(<ImageUploader {...defaultProps} value={newImageUrl} />)
    
    // 新しい画像が表示されている
    imageContainer = screen.getByText('Image').nextSibling.firstChild
    expect(imageContainer).toHaveStyle(`background-image: url(${newImageUrl})`)
  })

  it('updates image when forceValue prop changes', () => {
    const imageUrl = 'https://example.com/image.jpg'
    const { rerender } = render(<ImageUploader {...defaultProps} value={imageUrl} forceValue={1} />)
    
    // 画像が表示されている
    let imageContainer = screen.getByText('Image').nextSibling.firstChild
    expect(imageContainer).toHaveStyle(`background-image: url(${imageUrl})`)
    
    // forceValueを変更してre-render
    rerender(<ImageUploader {...defaultProps} value={imageUrl} forceValue={2} />)
    
    // 画像が再設定されている（useEffectが再実行される）
    imageContainer = screen.getByText('Image').nextSibling.firstChild
    expect(imageContainer).toHaveStyle(`background-image: url(${imageUrl})`)
  })

  it('has correct hidden inputs', () => {
    render(<ImageUploader {...defaultProps} />)
    
    // ファイル入力フィールドが存在する
    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).toHaveAttribute('name', 'image')
    expect(fileInput).toHaveAttribute('type', 'file')
    expect(fileInput).toHaveStyle('display: none')
    
    // 削除フラグの隠しフィールドが存在する
    const hiddenInput = document.querySelector('input[type="hidden"]')
    expect(hiddenInput).toHaveAttribute('name', 'will_delete_image')
    expect(hiddenInput).toHaveAttribute('type', 'hidden')
  })

  it('resets deletion flag when selecting new file', async () => {
    const imageUrl = 'https://example.com/image.jpg'
    render(<ImageUploader {...defaultProps} value={imageUrl} />)
    
    // まずクリアして削除フラグを設定
    const clearButton = screen.getByText('clear')
    fireEvent.click(clearButton)
    
    expect(screen.getByDisplayValue('true')).toBeInTheDocument()
    
    // 新しいファイルを選択
    const selectButton = screen.getByText('select...')
    fireEvent.click(selectButton)
    
    // 削除フラグがリセットされている
    await waitFor(() => {
      const hiddenInput = document.querySelector('input[type="hidden"]')
      expect(hiddenInput).toHaveAttribute('value', '')
    })
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