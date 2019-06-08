export const compareWithMapLoaded = (prevProps, nextProps) => {
    if (! nextProps.mapLoaded ) return true;
    
    const keys = Object.keys(prevProps);
 
    for (const key of keys) {
        if (prevProps[key] !== nextProps[key]) {
            return false;
        }
    }
 
    return true;
};