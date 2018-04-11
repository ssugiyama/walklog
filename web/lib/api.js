const express = require('express')
  ,   models  = require('./models')
  ,   fs      = require('fs')
  ,   Sequelize = require('sequelize')
  ,   sequelize = models.sequelize
  ,   Walk    = models.sequelize.models.walks
  ,   Area    = models.sequelize.models.areas
  ,   Users   = models.sequelize.models.users;

const Op = Sequelize.Op;

const api = express.Router();
module.exports = api;

const searchFunc = params => {
    const order_hash = {
        'newest_first'       : ['date', 'desc'],
        'oldest_first'       : 'date',
        'longest_first'      : ['length', 'desc'],
        'shortest_first'     : 'length',
        'easternmost_first'  : [sequelize.fn('st_xmax', sequelize.col('path')),  'desc'],
        'westernmost_first'  : sequelize.fn('st_xmin', sequelize.col('path')),
        'southernmost_first' : sequelize.fn('st_ymin', sequelize.col('path')),
        'northernmost_first' : [sequelize.fn('st_ymax', sequelize.col('path')), 'desc'],
        'nearest_first'      : sequelize.literal('distance'),
    };
    const where = [];
    const order = order_hash[params.order || 'newest_first'];
    const attributes = ['id', 'date', 'title', 'comment', 'path', 'length'];
    if (params.id) {
        where.push({id: params.id});
    }
    else if (params.date) {
        where.push({date: params.date});
    }
    else {
        if (params.user) {
            where.push({user_id: parseInt(params.user)});
        }
        if (params.year) {
            where.push(sequelize.where(sequelize.fn('date_part', 'year', sequelize.col('date')), parseInt(params.year)));
        }
        if (params.month) {
            where.push(sequelize.where(sequelize.fn('date_part', 'month', sequelize.col('date')), parseInt(params.month)));
        }

        if (params.filter == 'neighborhood') {
            const latitude  = parseFloat(params.latitude);
            const longitude = parseFloat(params.longitude);
            const radius    = parseFloat(params.radius);
            const dlat      = radius*180/Math.PI/models.EARTH_RADIUS;
            const mlat      = latitude > 0 ? latitude + dlat : latitude - dlat;
            const dlon      = dlat/Math.cos(mlat/180*Math.PI);
            const center    = Walk.getPoint(longitude, latitude);
            const lb        = Walk.getPoint(longitude-dlon, latitude-dlat);
            const rt        = Walk.getPoint(longitude+dlon, latitude+dlat);
            where.push(sequelize.where(sequelize.fn('st_makebox2d', lb, rt), {
                [Op.overlap]: sequelize.col('path')
            }));
            where.push(sequelize.where(sequelize.fn('st_distance', sequelize.col('path'), center, true), {
                [Op.lte]: radius
            }));
        }
        else if (params.filter == 'cities') {
            if (!params.cities) {
                res.json({
                    count: 0,
                    rows: []
                });
                return;
            }
            const cities = params.cities.split(/,/).map(function (elm) { return `'${elm}'`; }).join(',');
            where.push(sequelize.literal(`EXISTS (SELECT * FROM areas WHERE jcode IN (${cities}) AND path && the_geom AND ST_Intersects(path, the_geom))`));
        }
        else if (params.filter == 'crossing') {
            if (!params.searchPath) {
                res.json({
                    count: 0,
                    rows: []
                });
                return;
            }
            const linestring = Walk.decodePath(params.searchPath);
            where.push({ 
                path: {
                    [Op.overlap]: linestring
                }
            });
            where.push(sequelize.fn('ST_Intersects', sequelize.col('path'), linestring));
        }
        else if (params.filter == 'hausdorff') {
            if (!params.searchPath) {
                res.json({
                    count: 0,
                    rows: []
                });
                return;
            }
            const max_distance = params.max_distance || 4000;
            const linestring = Walk.decodePath(params.searchPath);
            const extent     = Walk.getPathExtent(params.searchPath);
            const dlat       = max_distance*180/Math.PI/models.EARTH_RADIUS;
            const mlat       = Math.max(Math.abs(extent.ymax + dlat), Math.abs(extent.ymin-dlat));
            const dlon       = dlat/Math.cos(mlat/180*Math.PI);
            const lb         = Walk.getPoint(extent.xmin-dlon, extent.ymin-dlat);
            const rt         = Walk.getPoint(extent.xmax+dlon, extent.ymax+dlat);

            attributes.push([`ST_HausdorffDistance(ST_Transform(path, ${models.SRID_FOR_SIMILAR_SEARCH}), ST_Transform('${linestring}'::Geometry, ${models.SRID_FOR_SIMILAR_SEARCH}))/1000`, 'distance']);
            where.push(sequelize.fn('ST_Within', sequelize.col('path'), sequelize.fn('ST_SetSRID', sequelize.fn('ST_MakeBox2d', lb, rt), models.SRID)));
            where.push(sequelize.where(
                        sequelize.fn('ST_HausdorffDistance', 
                            sequelize.fn('ST_Transform', sequelize.col('path'), models.SRID_FOR_SIMILAR_SEARCH), 
                            sequelize.fn('ST_Transform', sequelize.fn('st_geomfromtext', linestring), models.SRID_FOR_SIMILAR_SEARCH)), {
                                [Op.lt]: max_distance
                            }));
        }
        else if (params.filter == 'frechet') {
            if (!params.searchPath) {
                res.json({
                    count: 0,
                    rows: []
                });
                return;
            }
            const max_distance = params.max_distance || 4000;
            const linestring = Walk.decodePath(params.searchPath);
            const sp         = Walk.getStartPoint(params.searchPath);
            const ep         = Walk.getEndPoint(params.searchPath);
            const dlat       = max_distance*180/Math.PI/models.EARTH_RADIUS;
            const mlat       = Math.max(Math.abs(sp[1] + dlat), Math.abs(sp[1] - dlat), Math.abs(ep[1] + dlat), Math.abs(ep[1] - dlat));
            const dlon       = dlat/Math.cos(mlat/180*Math.PI);
            const slb         = Walk.getPoint(sp[0]-dlon, sp[1]-dlat);
            const srt         = Walk.getPoint(sp[0]+dlon, sp[1]+dlat);
            const elb         = Walk.getPoint(ep[0]-dlon, ep[1]-dlat);
            const ert         = Walk.getPoint(ep[0]+dlon, ep[1]+dlat);

            attributes.push([`ST_FrechetDistance(ST_Transform(path, ${models.SRID_FOR_SIMILAR_SEARCH}), ST_Transform('${linestring}'::Geometry, ${models.SRID_FOR_SIMILAR_SEARCH}))/1000`, 'distance']);
            where.push(sequelize.fn('ST_Within', sequelize.fn('ST_StartPoint', sequelize.col('path')), sequelize.fn('ST_SetSRID', sequelize.fn('ST_MakeBox2d', slb, srt), models.SRID)));
            where.push(sequelize.fn('ST_Within', sequelize.fn('ST_EndPoint', sequelize.col('path')), sequelize.fn('ST_SetSRID', sequelize.fn('ST_MakeBox2d', elb, ert), models.SRID)));
            where.push(sequelize.where(
                        sequelize.fn('ST_FrechetDistance',
                            sequelize.fn('ST_Transform', sequelize.col('path'), models.SRID_FOR_SIMILAR_SEARCH),
                            sequelize.fn('ST_Transform', sequelize.fn('st_geomfromtext', linestring), models.SRID_FOR_SIMILAR_SEARCH)), {
                                [Op.lt]: max_distance
                            }));
        }
    }
    const limit  = parseInt(params.limit) || 20;
    const offset = parseInt(params.offset) || 0;
    return new Promise((resolve, reject) => {
        Walk.findAndCountAll({
            attributes : attributes,
            order  : [order],
            where  : {[Op.and]: where},
            offset : offset,
            limit  : limit,
            include: [{ model: Users }]
        }).then(function (result) {
            let qparams = null;
            if (result.count > offset + limit) {
                const q = Object.keys(params).filter(e => e != 'offset').map( e => e + '=' + params[e]);
                q.push('offset=' +  (offset + limit));
                qparams = q.join('&');
            }
            let prev_id, next_id;
            if (params.id) {
                models.sequelize.query('SELECT id FROM walks where id > ? order by id limit 1',
                    { replacements: [params.id], type: models.sequelize.QueryTypes.SELECT }
                ).then(ids => {
                    if (ids.length > 0) next_id = ids[0].id;
                    return models.sequelize.query('SELECT id FROM walks where id < ? order by id desc limit 1',
                        { replacements: [params.id], type: models.sequelize.QueryTypes.SELECT }
                    );
                }).then(ids => {
                    if (ids.length > 0) prev_id = ids[0].id;
                    resolve({
                        count: result.count,
                        params: qparams,
                        rows:  result.rows.map(function (row) { return row.asObject(true); }),
                        next_id: next_id,
                        prev_id: prev_id
                    });
                });
            } else {
                resolve({
                    count: result.count,
                    params: qparams,
                    rows:  result.rows.map(function (row) { return row.asObject(true); })
                });
            }
        }).catch (function (reason) {
            reject({error: reason});
        });
    });
};

api.get('/version', function(req, res){
    fs.readFile('package.json', function (err, data) {
        const json = JSON.parse(data);
        res.json({
            app_version: json.version,
            app_env: process.env.NODE_ENV,
        });
    });
});

api.get('/search', function(req, res){
    searchFunc(req.query).then(json => {
        res.json(json);
    }).catch(error => {
        res.status(500).json(error);
    });
});

api.get('/cities', function(req, res){
    const jcodes    = req.query.jcodes;
    let where, latitude, longitude;
    if (jcodes) {
        where = { jcode : { $in : jcodes.split(/,/) } };
    }
    else{
        latitude  = parseFloat(req.query.latitude);
        longitude = parseFloat(req.query.longitude);
        where = sequelize.fn('st_contains', sequelize.col('the_geom'), sequelize.fn('st_setsrid', sequelize.fn('st_point', longitude, latitude), models.SRID));
    }
    Area.findAll({
        where  : where
    }).then(function (result) {
        res.json(result.map(function (obj) { return obj.asObject(); }));
    }).catch (function (reason) {
        res.status(500).json({error: reason});
    });
});

api.post('/save', function(req, res) {
    if (! req.user) {
        res.status(403);
        return;
    }

    const linestring = req.body.path ? Walk.decodePath(req.body.path) : null;
    let query;
    let values;
    if (req.body.id) {
        if (linestring) {
            query = 'UPDATE walks SET date = ?, title = ?, "comment" = ?, path = ?, length = ST_LENGTH(?, TRUE)/1000, updated_at = NOW() WHERE id = ? AND user_id = ?RETURNING *';
            values = [req.body.date, req.body.title, req.body.comment, linestring, linestring, req.body.id, req.user.id];
        }
        else {
            query = 'UPDATE walks SET date = ?, title = ?, "comment" = ?, updated_at = NOW() WHERE id = ? AND user_id = ? RETURNING *';
            values = [req.body.date, req.body.title, req.body.comment, req.body.id, req.user.id];
        }
    }
    else {
        query = 'INSERT INTO walks (user_id, date, title, "comment", path, length, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ST_LENGTH(?, TRUE)/1000, NOW(), NOW()) RETURNING *';
        values = [req.user.id, req.body.date, req.body.title, req.body.comment, linestring, linestring];
    }
    models.sequelize.query(query, {model: Walk, replacements: values}).then(function (rows) {
        res.json(rows.map(function (row) { return row.asObject(true); } ));
    }).catch (function (reason) {
        res.status(500).json({error: reason});
    });
});

api.get('/destroy/:id', function(req, res) {
    if (! req.user) {
        res.status(403);
        return;
    }
    Walk.destroy({where : { id : req.params.id } }).then(function () {
        res.end('');
    }).catch (function (reason) {
        res.status(500).json({error: reason});
    });
});
