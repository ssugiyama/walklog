var HtmlWebpackPlugin = require('html-webpack-plugin');
var webpack = require('webpack');
		 
module.exports = {
    entry : './src/entry.js',
    output : {
	path: 'public',
	filename: 'bundle.js'
    },
    module: {
        loaders: [
	    {
		test: /\.scss$/,
		loader: 'style-loader!css-loader!sass-loader'
	    },
	    { test: /\.css$/, loader: 'style-loader!css-loader' },
	    { test: /\.svg$/, loader: 'url-loader?mimetype=image/svg+xml' },
	    { test: /\.woff$/, loader: 'url-loader?mimetype=application/font-woff' },
	    { test: /\.woff2$/, loader: 'url-loader?mimetype=application/font-woff' },
	    { test: /\.eot$/, loader: 'url-loader?mimetype=application/font-woff' },
	    { test: /\.ttf$/, loader: 'url-loader?mimetype=application/font-woff' }]
    },
    plugins: [
	new HtmlWebpackPlugin({
	    title: 'walklog',
	    template: './src/index.html',
	    filename: 'index.html'
	}),
	new webpack.optimize.UglifyJsPlugin({
	    compress: {
		warnings: false
	    },
	    sourceMap: false,
	    mangle: false
	})
    ]
};
