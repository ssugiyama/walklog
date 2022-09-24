module.exports = api => {
    api.cache(true);
    const ignoreImports = { 'extensions': ['.css'] };
    return {
        'presets': ['@babel/preset-env', '@babel/preset-react'],
        'plugins': [
            ['ignore-import', ignoreImports],
            '@babel/plugin-transform-runtime',
        ]
    };
};
