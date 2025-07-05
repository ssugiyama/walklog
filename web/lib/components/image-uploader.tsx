import React, {
  useState, useRef, useCallback,
  useEffect,
} from 'react'
import { FormControl, FormLabel, Button } from '@mui/material'
import Box from '@mui/material/Box'

type ImageUploaderProps = {
  name: string
  nameForDeletion: string
  label: string
  defaultValue: string | null
  forceDefaultValue?: number | null
  onChange?: (ev: React.ChangeEvent<HTMLInputElement>) => void
}
const ImageUploader = ({ name, nameForDeletion, label, defaultValue, forceDefaultValue, onChange }: ImageUploaderProps) => {
  const [imageUrl, setImageUrl] = useState(defaultValue)
  const [willDeleteImage, setWillDeleteImage] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    setImageUrl(defaultValue)
  }, [defaultValue, forceDefaultValue])

  const handleChange = (ev1) => {
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
    setWillDeleteImage('')
  }, [])

  const handleClear = useCallback((ev) => {
    setImageUrl(null)
    setWillDeleteImage('true')
    if (onChange) {
      onChange(ev)
    }
  }, [])
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
      <input type="hidden" name={nameForDeletion} value={willDeleteImage} />
    </FormControl>
  )
}

export default ImageUploader
