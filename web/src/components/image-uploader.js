import React, { useEffect, useState, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { FormControl, FormLabel, Button } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';

const styles = {
    imageBox: {
        width: 150,
        height: 150,
        borderWidth: 1,
        borderStyle: 'solid',
        backgroundSize: 'contain',
    },
    fileInput: {
        display: 'none'
    },
    hbox: {
        display: 'flex',
        flexDirection: 'row'
    },
    vbox: {
        display: 'flex',
        flexDirection: 'column'
    }
};

const useStyles = makeStyles(styles);

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

    const classes = useStyles(props);
    return (
        <FormControl>
            <FormLabel>{props.label}</FormLabel>
            <div className={classes.hbox}>
                <div className={classes.imageBox} style={
                    imageUrl ? {
                        backgroundImage: `url(${imageUrl})`
                    } : {}
                }></div>
                <div className={classes.vbox}>
                    <Button onClick={handleSelect}>select...</Button>
                    <Button onClick={handleClear}>clear</Button>
                </div>
            </div>
            <input type="file" ref={fileInputRef} className={classes.fileInput} />
        </FormControl>
    );
};

export default ImageUploader;