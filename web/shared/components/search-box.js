import React, { useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { push } from '@lagunovsky/redux-react-router';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import SearchForm from './search-form';
import { idToUrl } from '../utils/meta-utils';

const SearchBox = () => {
    const lastQuery = useSelector((state) => state.api.lastQuery);
    const users = useSelector((state) => state.misc.users);
    const offset = useSelector((state) => state.api.result.offset);
    const count = useSelector((state) => state.api.result.count);
    const error = useSelector((state) => state.api.result.error);
    const rows = useSelector((state) => state.api.result.rows);
    const searching = useSelector((state) => state.api.result.searching);
    const dispatch = useDispatch();

    const [showDistance, setShowDistance] = useState(true);

    const handleSelect = (index) => {
        const item = rows[index];
        dispatch(push(idToUrl(item.id)));
    };
    const handleShowDistance = useCallback((e) => {
        setShowDistance(e.target.value);
    });
    const moreUrl = `/?offset=${offset}${lastQuery ? `&${lastQuery}` : ''}`;
    const userObjs = {};
    users.forEach((u) => { userObjs[u.uid] = u; });
    const sxCell = {
        padding: 1,
        '&:nth-of-type(1)': {
            width: 40,
            whiteSpace: 'nowrap',
        },
        '&:nth-of-type(2)': {
            width: 80,
            whiteSpace: 'nowrap',
        },
        '&:nth-of-type(4)': {
            width: 40,
            textAlign: 'right',
        },
    };
    return (
        <Paper sx={{ p: 1 }} data-testid="SearchBox">
            <SearchForm />
            <Divider sx={{ m: (theme) => theme.spacing(2) }} />
            <Box display="flex" sx={{ m: 1 }}>
                <Typography variant="body1" sx={{ display: 'inline-block' }}>
                    {
                        (() => {
                            if (error) {
                                return (
                                    <span>
                                        error:
                                        {error.message}
                                    </span>
                                );
                            } if (searching) {
                                return <span>Searching now...</span>;
                            }
                            switch (count) {
                            case null:
                                return <span>successfully saved</span>;
                            case 0:
                                return <span>No results</span>;
                            case 1:
                                return <span>1 / 1 item</span>;
                            default:
                                return (
                                    <span>
                                        {rows.length}
                                        {' '}
                                        /
                                        {' '}
                                        {count}
                                        {' '}
                                        walks
                                    </span>
                                );
                            }
                        })()
                    }
                </Typography>
            </Box>
            <Table sx={{ cursor: 'pointer' }}>
                <TableHead>
                    <TableRow>
                        <TableCell sx={sxCell}><Typography variant="body2">user</Typography></TableCell>
                        <TableCell sx={sxCell}><Typography variant="body2">date</Typography></TableCell>
                        <TableCell sx={sxCell}><Typography variant="body2">title</Typography></TableCell>
                        <TableCell sx={sxCell}>
                            {
                                rows.length > 0 && rows[0].distance !== undefined ?
                                    (
                                        <Select value={showDistance} onChange={handleShowDistance}>
                                            <MenuItem value><Typography variant="body2">distance</Typography></MenuItem>
                                            <MenuItem value={false}><Typography variant="body2">length</Typography></MenuItem>
                                        </Select>
                                    ) : (<Typography variant="body1">length</Typography>)
                            }
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    { rows.map((item, index) => {
                        const u = userObjs[item.uid];
                        return (
                            <TableRow
                                sx={{
                                    '&:nth-of-type(odd)': { backgroundColor: 'background.default' },
                                    filter: item.draft ? 'opacity(.5)' : 'opacity(1)',
                                }}
                                key={item.id}
                                onClick={() => handleSelect(index)}
                            >
                                <TableCell sx={sxCell}>
                                    {
                                        u &&
                                            (
                                                <Avatar
                                                    alt={u.displayName}
                                                    src={u.photoURL}
                                                    sx={{ width: 24, height: 24 }}
                                                />
                                            )
                                    }
                                </TableCell>
                                <TableCell sx={sxCell}>{item.date}</TableCell>
                                <TableCell sx={sxCell}>{item.title}</TableCell>
                                <TableCell sx={sxCell}>
                                    {
                                        showDistance && item.distance !== undefined ?
                                            item.distance.toFixed(1) :
                                            item.length.toFixed(1)
                                    }
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
            {
                offset > 0 &&
                    (
                        <Button
                            variant="outlined"
                            sx={{ width: 'calc(100% - 20px)', m: 1 }}
                            color="primary"
                            component={Link}
                            to={moreUrl}
                        >
                            <ExpandMoreIcon sx={{ mr: 1 }} />
                            {' '}
                            more
                        </Button>
                    )
            }
        </Paper>
    );
};

export default SearchBox;
