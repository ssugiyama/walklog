var webpack = require('webpack');

module.exports = {
    entry : './src/main.js',
    output : {
	path: 'public',
	filename: 'bundle.js'
    },
    module: {
        loaders: [
	    {
		test: /\.jsx?$/,
		loader: 'babel-loader',
		exclude: /node_modules/,
		query:{
		    presets: ['react', 'es2015']
		}
	    },
	]
    },
    plugins: [
	new webpack.DefinePlugin({
	    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
	})
    ]
};
