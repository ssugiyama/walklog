const
    express    = require('express'),
    multer     = require('multer'),
    { nanoid } = require('nanoid'),
    models     = require('./models'),
    path       = require('path'),
    url        = require('url'),
    config     = require('react-global-configuration').default,
    admin      = require('firebase-admin'),
    Sequelize  = require('sequelize'),
    searchFunc = require('./search').searchFunc,
    sequelize  = models.sequelize,
    Walk       = models.Walk,
    Area       = models.Area;

const Op = Sequelize.Op;

const api = express.Router();
module.exports = api;

const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join('./public', config.get('imagePrefix')));
    },
    filename: (req, file, cb) => {
        const match = file.originalname.match(/\.\w+$/);
        const ext = match ? match[0] : '';
        const basename = `${req.body.date}-${nanoid(4)}`;
        cb(null, match ? basename + ext : basename);
    }
});

const useFirebaseStorage = config.get('useFirebaseStorage');

api.get('/version', async (req, res) => {
    res.json({
        appVersion: process.env.npm_package_version,
        appEnv: process.env.NODE_ENV || 'development',
    });
});

api.get('/search', async (req, res) => {
    const claim = await authorize(req);
    try {
        const uid = claim ? claim.uid : null;
        const json = await searchFunc(req.query, uid);
        res.json(json);
    }catch(error) {
        res.status(500).json(error);
    }
});

api.get('/get/:id', async (req, res) => {
    try {
        const claim = await authorize(req);
        const uid = claim ? claim.uid : null;
        const json = await searchFunc({id: req.params.id, draft: req.query.draft}, uid);
        res.json(json);
    } catch(error) {
        res.status(500).json(error);
    }
});

api.get('/cities', async (req, res) => {
    const jcodes    = req.query.jcodes;
    let where, latitude, longitude;
    if (jcodes) {
        where = { jcode : { [Op.in] : jcodes.split(/,/) } };
    }
    else{
        latitude  = parseFloat(req.query.latitude);
        longitude = parseFloat(req.query.longitude);
        where = sequelize.fn('st_contains', sequelize.col('the_geom'), sequelize.fn('st_setsrid', sequelize.fn('st_point', longitude, latitude), Walk.SRID));
    }
    try {
        const result = await Area.findAll({
            where  : where
        });
        res.json(result.map(obj => obj.asObject()));
    } catch(error) {
        res.status(500).json({error});
    }
});

const authorize = async (req) => {
    const authorization = req.get('Authorization');
    if (! authorization) return null;
    const parts = authorization.split(/ +/);
    if (parts.length != 2 || parts[0] != 'Bearer') return null;
    const idToken = parts[1];
    const claim = await admin.auth().verifyIdToken(idToken).catch(() => {
        return null;
    });
    return claim;
};

const getFilename = (req, file) => {
    const match = file.originalname.match(/\.\w+$/);
    const ext = match ? match[0] : '';
    const basename = `${req.body.date}-${nanoid(4)}`;
    return match ? basename + ext : basename;
};

const upload = multer({
    storage: useFirebaseStorage ? multer.memoryStorage() : diskStorage,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

api.post('/save', upload.single('image'), async (req, res) => {
    const claim = await authorize(req);
    if (! claim) {
        res.status(401);
        return;
    }
    if (req.body.path) {
        req.body.path = Walk.decodePath(req.body.path);
        req.body.length = sequelize.literal(`ST_LENGTH('${req.body.path}', true)/1000`);
    }
    try {
        if (req.file) {
            req.body.image = await new Promise((resolve, reject) => {
                if (useFirebaseStorage) {
                    const prefix = config.get('imagePrefix');
                    const bucket = admin.storage().bucket();
                    const blob = bucket.file(path.join(prefix, getFilename(req, req.file)));
                    const blobStream = blob.createWriteStream();
                    blobStream.on('error', (err) => {
                        reject(err);
                    });
                    blobStream.on('finish', () => {
                        blob.setMetadata({
                            contentType: req.file.mimetype,
                        });
                        resolve(url.resolve('https://storage.googleapis.com', path.join(bucket.name, blob.name)));
                    });
                    blobStream.end(req.file.buffer);
                }
                else {
                    resolve(url.resolve(config.get('baseUrl'), path.join(config.get('imagePrefix'), req.file.filename)));
                }
            }).catch(err => { throw err; });
        }
        if (req.body.id) {
            const walk = await Walk.findByPk(req.body.id);
            if (walk.uid != claim.uid && ! claim.admin) {
                res.status(403);
                return;
            }
            delete req.body.id;
            await walk.update(req.body);
            await walk.reload();
            res.json([walk.asObject(true)]);
        } else if (! config.get('onlyAdminCanCreate') || claim.admin ) {
            console.log(req.body)
            req.body.uid = claim.uid;
            const walk = await Walk.create(req.body);
            res.json([walk.asObject(true)]);
        } else {
            const error = 'only admin can create walks';
            res.status(403).json({error});
        }
    } catch (error) {
        console.debug(error);
        res.status(500).json({error});
    }
});

api.get('/destroy/:id', async (req, res) => {
    const claim = await authorize(req);
    if (! claim) {
        res.status(401);
        return;
    }
    try {
        const walk = await Walk.findByPk(req.params.id);
        if (walk.uid != claim.uid && !claim.admin) {
            res.status(403);
            return;
        }
        await walk.destroy();
        res.end('');
    } catch(error) {
        res.status(500).json({error});
    }
});
