const appBarHeight = 64;

export default {
    body: {
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        margin: 0
    },
    map: {
        position: 'absolute',
        top: appBarHeight,
        left: 0,
        right: 0,
        bottom: 0,
    },
    elevationBox: {
        width: '100%',
        height: 250,
    },
    commentBoxBody: {
        padding: '10px 20px',
        fontSize: '85%',
        lineHeight: '1.65',
        letterSpacing: '.1em',
        textAlign: 'justify',
        textIndent: '1.2em'
    },
    commentBoxControl: {
        width: '100%',
        textAlign: 'center'
    },
    twitter: {
        display: 'inline-block',
        marginLeft: 20
    },
    panoramaBoxBody: {
        width: '100%',
        height: 214
    },
    panoramaBoxControl: {
        width: '100%',
        textAlign: 'center',
        height: 36
    },
    panoramaBoxTitle: {
        float: 'left'
    },
    panoramaBoxOverlayToggle: {
        width: 120,
        float: 'right',
        marginTop: 40,
    },
    dialogCloseButton: {
        position: 'absolute',
        right: -10,
        top: -10,
    }
};
