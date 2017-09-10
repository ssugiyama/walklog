
/**
 * Module dependencies.
 */

const express    = require('express');
const bodyParser = require('body-parser');
const api        = require('./lib/api.js');
const http       = require('http');
const path       = require('path');
const morgan     = require('morgan');
const app        = express();
const handleSSR  = require('./dist/ssr').default;
const models     = require('./lib/models');
const Walk       = models.sequelize.models.walks;
const sitemap    = require('sitemap');
const session    = require('express-session');
const config     = require(./dist/config');
// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(morgan());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, 'public')));
app.set('trust proxy', 1); // trust first proxy

if ('development' == app.get('env')) {
    const errorhandler = require('errorhandler');
    app.use(errorhandler());
}

const sess = {
    secret: config.session_secret,
    cookie: {
        maxAge: config.session_max_age,
        secure: 'auto'
    }
};

app.use(session(sess))

app.use('/api', api);

app.use('/sitemap.xml', function(req, res) {
    const sm = sitemap.createSitemap({});
    Walk.findAll({
        attributes: ['d'],
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
