
/**
 * Module dependencies.
 */

var express    = require('express');
var bodyParser = require('body-parser');
var api        = require('./lib/api.js');
var http       = require('http');
var path       = require('path');
var morgan     = require('morgan');
var app        = express();
var handleSSR  = require('./dist/ssr').default;
var models     = require('./lib/models');
var Walk       = models.sequelize.models.walks;
var sitemap    = require('sitemap');
// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(morgan());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, 'public')));

if ('development' == app.get('env')) {
    var errorhandler = require('errorhandler');
    app.use(errorhandler());
}

app.use('/api', api);

app.use('/sitemap.xml', function(req, res) {
    var sm = sitemap.createSitemap({});
    Walk.findAll({
	attributes: ["id"],
	where: {
	    comment : {$ne: null}
	}
    }).then(function (results) {
	results.forEach(function (row) {
	    sm.add({ url: req.protocol + '://' + (req.get('X-Forwarded-Host') || req.get('Host')) + '/' + row.id });
	});
	sm.toXML( function (err, xml) {
	    if (err) {
		return res.status(500).end();
	    }
	    res.header('Content-Type', 'application/xml');
	    res.send( xml );
	});
    });
});

app.use('/', handleSSR);

http.createServer(app).listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
});
