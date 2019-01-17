
/**
 * Module dependencies.
 */

const config     = require('react-global-configuration');
const configuration = require('./config');

config.set(configuration.shared);

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
const auth       = require('./lib/auth');

// all environments
app.set('port', process.env.PORT || 3000);
app.use(morgan('tiny'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, 'public')));
app.set('trust proxy', 1); // trust first proxy

if ('development' == app.get('env')) {
    const errorhandler = require('errorhandler');
    app.use(errorhandler());
}

const sess = {
    secret: configuration.session_secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: configuration.session_max_age,
        secure: 'auto'
    }
};

app.use(session(sess));
app.use(auth.passport.initialize());
app.use(auth.passport.session());

app.use('/api', api);

app.use('/auth', auth.router);

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
