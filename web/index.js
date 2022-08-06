
/**
 * Module dependencies.
 */

const config     = require('react-global-configuration').default;
const configuration = {
    siteName:        process.env.SITE_NAME,
    siteDescription: process.env.SITE_DESCRIPTION,
    baseUrl:         process.env.BASE_URL,
    imagePrefix:     process.env.IMAGE_PREFIX,
    googleApiKey:    process.env.GOOGLE_API_KEY,
    googleApiVersion: process.env.GOOGLE_API_VERSION || 'weekly',
    twitterSite:     process.env.TWITTER_SITE,
    appVersion:      process.env.npm_package_version,
    themePrimary :   process.env.THEME_PRIMARY,
    themeSecondary : process.env.THEME_SECONDARY,
    firebaseConfig:  require(process.env.FIREBASE_CONFIG),
    onlyAdminCanCreate: process.env.ONLY_ADMIN_CAN_CREATE,
    useFirebaseStorage: process.env.USE_FIREBASE_STORAGE,
    itemPrefix:      process.env.ITEM_PREFIX || '/',
    mapStyleConfig:  require(process.env.MAP_STYLE_CONFIG || './default-map-styles.js'),
    mapTypeIds:      process.env.MAP_TYPE_IDS || 'roadmap,hybrid,satellite,terrain'
};

config.set(configuration);

const express    = require('express');
const bodyParser = require('body-parser');
const api        = require('./lib/api.js');
const http       = require('http');
const path       = require('path');
const morgan     = require('morgan');
const app        = express();
const handleSSR  = require('./dist/components/ssr').default;
const models     = require('./lib/models');
const Walk       = models.sequelize.models.walks;
const sitemap    = require('sitemap');
const Op         = require('sequelize').Op;
const admin      = require('firebase-admin');

const firebaseConfig = Object.assign({}, config.get('firebaseConfig'),
    { credential: admin.credential.applicationDefault() });
admin.initializeApp(firebaseConfig);

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

app.use('/api', api);

app.use('/sitemap.xml',  async (req, res) => {
    const sm = sitemap.createSitemap({});
    const results = await Walk.findAll({
        attributes: ['id'],
        where: {
            comment : {[Op.ne]: null}
        }
    });
    results.forEach(function (row) {
        sm.add({ url: req.protocol + '://' + (req.get('X-Forwarded-Host') || req.get('Host')) + config.get('itemPrefix') + row.id });
    });
    sm.toXML( function (err, xml) {
        if (err) {
            return res.status(500).end();
        }
        res.header('Content-Type', 'application/xml');
        res.send( xml );
    });
});

app.use('/', handleSSR);

http.createServer(app).listen(app.get('port'), function(){
    console.info('Express server listening on port ' + app.get('port'));
});
