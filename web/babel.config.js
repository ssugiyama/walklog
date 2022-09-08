module.exports = api => {
    const isTest = api.env('test');
    const ignoreImports = { 'extensions': ['.css'] };
    if (isTest) {
        ignoreImports['pathPattern'] = '../lib/search';
    }
    return {
        'presets': ['@babel/preset-env', '@babel/preset-react'],
        'plugins': [
            ['ignore-import', ignoreImports]
        ]
    };
};
