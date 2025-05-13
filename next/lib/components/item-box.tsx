'use client'
import React, { useState, useCallback, useEffect, useTransition, useActionState } from 'react';
import Link from 'next/link'
import { marked } from 'marked';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Fab from '@mui/material/Fab';
import NavigationArrowForwardIcon from '@mui/icons-material/ArrowForward';
import NavigationArrowBackIcon from '@mui/icons-material/ArrowBack';
import ListIcon from '@mui/icons-material/List';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import NoSsr from '@mui/material/NoSsr';
import DOMPurify from 'isomorphic-dompurify';
import WalkEditor from './walk-editor';
// import fetchWithAuth from '../fetch-with-auth';
// import { idToUrl } from '../utils/meta-utils';
import PanoramaBox from './panorama-box';
import ElevationBox from './elevation-box';
import type { Swiper as SwiperCore } from 'swiper';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';

import { idToUrl } from '../utils/meta-utils';
import { useData } from '../utils/data-context';
import { useSearchParams } from 'next/navigation';
import { useConfig } from '../utils/config';
import { useUserContext } from '../utils/user-context';
import { deleteItemAction } from '@/app/lib/walk-actions';
import { useRouter } from 'next/navigation'
const ItemBox = (props) => {
    const router = useRouter()
    const config = useConfig()
    const [tabValue, setTabValue] = useState(0);
    const { users, currentUser } = useUserContext()
    const searchParams = useSearchParams()
    const { data } = useData()
    const item = data.current
    const [editorOpened, setEditorOpened] = useState(false)
    const handleEdit = () => {
        setEditorOpened(true);
    };
    const [swiper, setSwiper] = React.useState<SwiperCore | null>(null);
    const onSwiper = useCallback((currentSwiper: SwiperCore) => {
        const swiperInstance = currentSwiper;
        setSwiper(swiperInstance);
    }, [])
    const tabChangeCB = useCallback((e, value) => {
        setTabValue(value);
        swiper?.slideTo(value);
    }, [swiper]);
    const indexCHangeCB = useCallback((swiper) => {
        console.log('indexCHangeCB', swiper.activeIndex);
        setTabValue(swiper.activeIndex);
    }, []);
    const initialDeleteState = {
        deleted: false,
        error: null,
        idTokenExpired: false,
        serial: 0,
    }
    const { updateIdToken } = useUserContext()
    const [isPending, startTransition] = useTransition();
    const [deleteState, dispatchDelete] = useActionState(deleteItemAction, initialDeleteState)
    const handleDelete = useCallback(() => {
        console.log('handleDelete', item?.id);
        startTransition(async () => {
            if (window.confirm('Are you sure to delete?')) {
                await dispatchDelete(item?.id)
            }
        })
    }, [item?.id]);
    useEffect(() => {
        if (deleteState.serial > 0) {
            console.log('deleteState', deleteState);
            if (deleteState.idTokenExpired) {
                (async () => {
                    await updateIdToken()
                    await dispatchDelete(item?.id)
                })()
            } else if (deleteState.error) {
                window.alert(deleteState.error)
            } else if (deleteState.deleted) {
                router.push(upUrl)
            }
        }
    }, [deleteState.serial]);
    let title; let createMarkup; let dataUser; let
        image;
    console.log('data', data);
    const itemWillRender = !data.isPending && !data.error && item
    if (data.isPending) {
        title = 'Loading...'
    } else if (data.error) {
        title = `Error: ${data.error}`
    } else if (item) {
        title = `${item.date} : ${item.title} (${item.length.toFixed(1)} km)`;
        createMarkup = () => ({ __html: DOMPurify.sanitize(marked.parse(item.comment || '')) });
        image = item.image;
        users.forEach((u) => {
            if (u.uid === item.uid) dataUser = u;
        });
    }
    const upUrl = `/?${searchParams.toString()}`;
    const draft = item?.draft;
    let nextUrl = data.nextId && idToUrl(config, data.nextId, searchParams)
    if (!nextUrl && data.offset > 0) {
        const params = new URLSearchParams(searchParams.toString())
        params.set('limit', (Number(data.offset) + 20).toString());
        nextUrl = `/?${params.toString()}&index=${data.offset}` 
    }       
    const prevUrl = data.prevId && idToUrl(config, data.prevId, searchParams)

    const sxImageBox = {
        float: ['none', 'left'],
        width: 320,
        mt: [0, 2],
        mr: ['auto', 2],
        mb: [0, 2],
        ml: ['auto', 0],
        display: ['inherit', 'block'],
    };
    return (
        <Box data-testid="ItemBox">
            <Paper sx={{ width: '100%', textAlign: 'center', padding: 2 }}>
                <Fab sx={{ float: 'left', marginLeft: 1, marginTop: 1 }} size="small" color="primary" component={Link} href={upUrl}><ListIcon /></Fab>
                <IconButton disabled={!prevUrl} component={Link} href={prevUrl || ''} size="large"><NavigationArrowBackIcon /></IconButton>
                <IconButton disabled={!nextUrl} component={Link} href={nextUrl || ''} size="large"><NavigationArrowForwardIcon /></IconButton>
                {
                    itemWillRender && currentUser && item.uid && currentUser.uid === item.uid ? (<IconButton onClick={handleEdit} size="large"><EditIcon /></IconButton>) : null
                }
                {
                    itemWillRender && currentUser && item.uid && currentUser.uid === item.uid ? (<IconButton disabled={isPending} onClick={handleDelete} size="large"><DeleteIcon /></IconButton>) : null
                }
                <Typography variant="h6" sx={{ fontSize: '100%' }}>{ title || 'not found'}</Typography>
                <Box sx={{ textAlign: 'right' }}>
                    {
                        draft ?
                            <Chip label="draft" color="warning" align="right" /> : dataUser ?
                                (
                                    <Chip
                                        avatar={(
                                            <Avatar
                                                alt={dataUser.displayName}
                                                src={dataUser.photoURL}
                                            />
                                        )}
                                        label={dataUser.displayName}
                                        variant="outlined"
                                    />
                                ) : null
                    }
                </Box>
            </Paper>
            { itemWillRender &&
                (
                    <Paper>
                        <Tabs
                            value={tabValue}
                            onChange={tabChangeCB}
                            sx={{ margin: '4px 0' }}
                            textColor="secondary"
                            variant="fullWidth"
                        >
                            <Tab label="Comment" sx={{ textTransform: 'none' }} />
                            <Tab label="Elevation" sx={{ textTransform: 'none' }} />
                            <Tab label="StreetView" sx={{ textTransform: 'none' }} />
                        </Tabs>
                    </Paper>
                )}
            { itemWillRender &&
                (
                    <Swiper
                        onSwiper={onSwiper} 
                        onSlideChange={indexCHangeCB}
                    >
                        <SwiperSlide sx={{ flexDirection: 'column', padding: 2, overflow: 'auto' }}>
                            {image &&
                            <Box sx={sxImageBox} component="img" src={image} />}
                            <Typography
                                variant="body2"
                                component="div"
                                sx={{
                                    textIndent: '1.2em',
                                    lineHeight: '1.65',
                                    letterSpacing: '.1em',
                                    textAlign: 'justify',
                                    '& a': {
                                        color: 'inherit',
                                    },
                                }}
                                dangerouslySetInnerHTML={createMarkup()}
                            />
                        </SwiperSlide>
                        <SwiperSlide sx={{ flexDirection: 'column', padding: 2 }}>
                            <NoSsr>
                                <ElevationBox />
                            </NoSsr>
                        </SwiperSlide>
                        <SwiperSlide sx={{ flexDirection: 'column', padding: 2 }}>
                            <PanoramaBox />
                        </SwiperSlide>
                    </Swiper>
                )}
             { itemWillRender && 
                <WalkEditor item={item} opened={editorOpened} setOpened={setEditorOpened} />
             }
        </Box>
    );
};

export default ItemBox;
