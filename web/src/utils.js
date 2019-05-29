export const compare_with_map_loaded = (prevProps, nextProps) => {
    if (! nextProps.map_loaded ) return true;
    
    const keys = Object.keys(prevProps);
 
    for (const key of keys) {
        if (prevProps[key] !== nextProps[key]) {
            return false;
        }
    }
 
    return true;
};