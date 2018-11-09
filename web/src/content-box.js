import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import SearchFormContainer from './search-form';
import { connect } from 'react-redux';
import IconButton from '@material-ui/core/IconButton';
import NavigationClose from '@material-ui/icons/Close';
import SearchIcon from '@material-ui/icons/Search';
import DescriptionIcon from '@material-ui/icons/Description';
import { withStyles } from '@material-ui/core/styles';
import { withRouter } from 'react-router-dom';
import { renderRoutes } from 'react-router-config';
import { routes } from './app';
import { toggleView } from './actions';
import { push } from 'connected-react-router';

const styles = theme => ({
    root: {
        width: '100%',
    },
    hidden: {
        display: 'none',
    },
});

class ContentBox extends Component {
    constructor(props) {
        super(props);
    }
    componentDidUpdate(prevProps, prevState) {
        if (prevProps.location.search != '?force_fetch=1' && this.props.location.search == '?force_fetch=1') return;
        const keys = ['filter', 'user', 'year', 'month', 'order', 'limit'];
        switch (this.props.filter) {
        case 'neighborhood':
            keys.push('radius', 'longitude', 'latitude');
            break;
        case 'cities':
            keys.push('cities');
            break;
        case 'crossing':
        case 'hausdorff':
        case 'frechet':
            keys.push('searchPath');
            break;
        }
        const query = {};
        keys.forEach(key => { query[key] = this.props[key] || ''; });
        if (keys.every(key => prevProps[key] == this.props[key])) return;
        if (prevProps.filter != this.props.filter && this.props.filter == 'neighborhood' && this.props.center) {
            query.latitude = this.props.center.lat;
            query.longitude = this.props.center.lng;
        }
        const usp = new URLSearchParams(query);
        this.props.push({
            pathname: '/',
            search: usp.toString(),
        });
        if (this.props.view == 'content') {
            if ( prevProps.filter != this.props.filter 
                && ( ['neighborhood', 'cities'].some(item => item == this.props.filter))
                  || ( ['hausdorff', 'crossing', 'frechet'].some(item => item == this.props.filter) && ! query.searchPath) ) {
                setTimeout(this.props.toggleView.bind(this), 1000);
            }           
        }
        else {
            if (! (query.filter == 'cities' && ! query.cities) && 
                ! ((query.filter == 'crossing' || query.filter == 'hausdorff' || query.filter == 'frechet') && ! query.searchPath)) {
                setTimeout(this.props.toggleView.bind(this), 1000);
            }
        }
    }
    render() {
        const { classes, view } = this.props;
        return (
            <div className={view == 'content' ? classes.root: classes.hidden}>
                { renderRoutes(routes) }
            </div>
        );
    }
}

function mapStateToProps(state) {
    const { view, highlighted_path, selected_item, center } = state.main;
    const { location } =  state.router;
    return Object.assign({}, state.main.search_form, { 
        view, highlighted_path, selected_item, center, location,
    });
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({  push, toggleView }, dispatch);
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(ContentBox)));
