import React, {
  useState, useRef, useCallback,
  useEffect,
} from 'react'
import { FormControl, FormLabel, Button } from '@mui/material'
import Box from '@mui/material/Box'

type ImageUploaderProps = {
  name: string
  label: string
  defaultValue: string | null
  onChange?: (ev: React.ChangeEvent<HTMLInputElement>) => void
  onClear?: () => void
}

const ImageUploader = ({ name, label, defaultValue, onChange, onClear }: ImageUploaderProps) => {
  const [imageUrl, setImageUrl] = useState(defaultValue)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setImageUrl(defaultValue)
  }, [defaultValue])

  const handleChange = (ev1: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev1.target.files[0]
    const reader = new FileReader()
    reader.addEventListener('loadend', (ev2) => {
      setImageUrl(ev2.target.result.toString())
    })
    if (onChange) {
      onChange(ev1)
    }
    reader.readAsDataURL(file)
  }
  const handleSelect = useCallback(() => {
    const elem = fileInputRef.current
    setTimeout(() => elem.click(), 0)
  }, [])

  const handleClear = useCallback(() => {
    setImageUrl(null)
    if (onClear) {
      onClear()
    }
  }, [onClear])
  return (
    <FormControl sx={{ textAlign: 'left'}}>
      <FormLabel>{label}</FormLabel>
      <Box sx={{ display: 'flex', flexDirection: 'row' }}>
        <Box
          sx={{
            width: 150, height: 150, borderWidth: 1, borderStyle: 'solid', backgroundSize: 'contain',
          }}
          style={
            imageUrl ? {
              backgroundImage: `url(${imageUrl})`,
            } : {}
          }
        />
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Button onClick={handleSelect} color="secondary">select...</Button>
          <Button onClick={handleClear}>clear</Button>
        </Box>
      </Box>
      <input type="file" name={name} ref={fileInputRef} onChange={handleChange} style={{ display: 'none' }} />
    </FormControl>
  )
}

export default ImageUploader
