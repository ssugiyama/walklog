import React, { useEffect, useState, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { FormControl, FormLabel, Button } from '@mui/material';
import Box from '@mui/material/Box';

const ImageUploader = props => {
    const [imageUrl, setImageUrl] = useState(props.value);
    const fileInputRef = useRef();

    useEffect(() => {
        fileInputRef.current.addEventListener('change', e =>{
            handleChange(e);
        });
    }, []);

    const handleChange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.addEventListener('loadend', e => {
            setImageUrl(e.target.result);
        });
        reader.readAsDataURL(file);
        const onChange = props.onChange;
        if (onChange && typeof onChange === 'function') onChange(file);
    };
    const handleSelect = useCallback(() => {
        const elem = ReactDOM.findDOMNode(fileInputRef.current);
        setTimeout(() => elem.click(), 0);
    });
    const handleClear = useCallback(() => {
        setImageUrl(null);
        const onChange = props.onChange;
        if (onChange && typeof onChange === 'function') onChange('');
    });

    return (
        <FormControl>
            <FormLabel>{props.label}</FormLabel>
            <Box sx={{ display: 'flex', flexDirection: 'row'}}>
                <Box sx={{ width: 150, height: 150, borderWidth: 1, borderStyle: 'solid', backgroundSize: 'contain',}} style={
                    imageUrl ? {
                        backgroundImage: `url(${imageUrl})`
                    } : {}
                }></Box>
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