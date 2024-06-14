import React, {
    useEffect, useState, useRef, useCallback,
} from 'react';
import { FormControl, FormLabel, Button } from '@mui/material';
import Box from '@mui/material/Box';

const ImageUploader = ({ label, value, onChange }) => {
    const [imageUrl, setImageUrl] = useState(value);
    const fileInputRef = useRef();

    const handleChange = (ev1) => {
        const file = ev1.target.files[0];
        const reader = new FileReader();
        reader.addEventListener('loadend', (ev2) => {
            setImageUrl(ev2.target.result);
        });
        reader.readAsDataURL(file);
        if (onChange && typeof onChange === 'function') onChange(file);
    };

    useEffect(() => {
        fileInputRef.current.addEventListener('change', (e) => {
            handleChange(e);
        });
    }, []);

    const handleSelect = useCallback(() => {
        const elem = fileInputRef.current;
        setTimeout(() => elem.click(), 0);
    }, []);
    const handleClear = useCallback(() => {
        setImageUrl(null);
        if (onChange && typeof onChange === 'function') onChange('');
    });
    return (
        <FormControl>
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
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} />
        </FormControl>
    );
};

export default ImageUploader;
