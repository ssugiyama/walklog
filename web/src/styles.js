const appBarHeight = 64;
const bottomBarHeight = 56;

export default {
    body: {
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        margin: 0
    },
    sideBox: {
        marginTop: appBarHeight + 1,
    },
    tabs: {
        marginBottom: appBarHeight + 1,
    },
    map: {
        position: 'absolute',
        top: appBarHeight,
        left: 0,
        right: 0,
        bottom: bottomBarHeight,
    },
    bottomBar: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
    },
    bottomBarGroup: {
        margin: 'auto',
    },
    elevationBox: {
        width: '100%',
        height: 250,
    },
    commentBoxBody: {
        padding: '10px 20px',
        textAlign: 'justify'
    },
    commentBoxTitle: {
        fontSize: '90%'
    },
    commentBoxAuthor: {
        fontSize: '80%',
        textAlign: 'right',
    },
    commentBoxAuthorPhoto: {
        width: '16px',
    },        
    commentBoxText: {
        textIndent: '1.2em',
        fontSize: '85%',
        lineHeight: '1.65',
        letterSpacing: '.1em',
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
