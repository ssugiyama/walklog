var webpack = require('webpack');

module.exports = {
    entry : './src/main.js',
    output : {
	path: __dirname + '/public',
	filename: 'bundle.js'
    },
    module: {
        rules: [
	    {
		test: /\.jsx?$/,
		loader: 'babel-loader',
		exclude: /node_modules/,
		query:{
		    presets: ['react', 'env']
		}
	    },
	]
    }
};
