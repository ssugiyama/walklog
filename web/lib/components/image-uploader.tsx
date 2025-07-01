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
  value: string | null
  forceValue?: number | null
}
const ImageUploader = ({ name, nameForDeletion, label, value, forceValue }: ImageUploaderProps) => {
  const [imageUrl, setImageUrl] = useState(value)
  const [willDeleteImage, setWillDeleteImage] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    setImageUrl(value)
  }, [value, forceValue])

  const handleChange = (ev1) => {
    const file = ev1.target.files[0]
    const reader = new FileReader()
    reader.addEventListener('loadend', (ev2) => {
      setImageUrl(ev2.target.result)
    })
    reader.readAsDataURL(file)
  }
  const handleSelect = useCallback(() => {
    const elem = fileInputRef.current
    setTimeout(() => elem.click(), 0)
    setWillDeleteImage('')
  }, [])

  const handleClear = useCallback(() => {
    setImageUrl(null)
    setWillDeleteImage('true')
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
