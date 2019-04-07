import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { FormControl, FormLabel, Button } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';

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


class ImageUploader extends Component {
    constructor(props) {
        super(props);
        this.state = {
            image_url: props.value,
        };
        this.fileInputRef = React.createRef();
    }
    componentDidMount() {
        this.fileInputRef.current.addEventListener('change', e =>{
            this.handleChange(e);
        });
    }
    handleChange(e) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.addEventListener('loadend', e => {
            this.setState({image_url: e.target.result});
        });
        reader.readAsDataURL(file);
        const onChange = this.props.onChange;
        if (onChange && typeof onChange === 'function') onChange(file);
    }
    handleSelect() {
        const elem = ReactDOM.findDOMNode(this.fileInputRef.current);
        setTimeout(() => elem.click(), 0);
    }
    handleClear() {
        this.setState({image_url: null});
        const onChange = this.props.onChange;
        if (onChange && typeof onChange === 'function') onChange('');
    }
    render() {
        const { classes } = this.props;
        return (
            <FormControl>
                <FormLabel>{this.props.label}</FormLabel>
                <div className={classes.hbox}>
                    <div className={classes.imageBox} style={
                        this.state.image_url ? {
                            backgroundImage: `url(${this.state.image_url})`
                        } : {}
                    }></div>
                    <div className={classes.vbox}>
                        <Button onClick={this.handleSelect.bind(this)}>select...</Button>
                        <Button onClick={this.handleClear.bind(this)}>clear</Button>
                    </div>
                </div>
                <input type="file" ref={this.fileInputRef} className={classes.fileInput} />
            </FormControl>
        );
    }


}

export default withStyles(styles)(ImageUploader);