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
    const order = order_hash[req.query.order] || 'date desc';
    const attributes = ['id', 'date', 'title', 'comment', 'path', 'length'];
    if (req.query.id) {
        where.push({id: req.query.id});
    }
    else if (req.query.date) {
        where.push({date: req.query.date});
    }
    else {
        if (req.query.user) {
            where.push({user_id: parseInt(req.query.user)});
        }
        if (req.query.year) {
            where.push(sequelize.where(sequelize.fn('date_part', 'year', sequelize.col('date')), parseInt(req.query.year)));
        }
        if (req.query.month) {
            where.push(sequelize.where(sequelize.fn('date_part', 'month', sequelize.col('date')), parseInt(req.query.month)));
        }

        if (req.query.filter == 'neighborhood') {
            const latitude  = parseFloat(req.query.latitude);
            const longitude = parseFloat(req.query.longitude);
            const radius    = parseFloat(req.query.radius);
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
        else if (req.query.filter == 'cities') {
            if (!req.query.cities) {
                res.json({
                    count: 0,
                    rows: []
                });
                return;
            }
            const cities = req.query.cities.split(/,/).map(function (elm) { return `'${elm}'`; }).join(',');
            where.push(sequelize.literal(`EXISTS (SELECT * FROM areas WHERE jcode IN (${cities}) AND path && the_geom AND ST_Intersects(path, the_geom))`));
        }
        else if (req.query.filter == 'crossing') {
            if (!req.query.searchPath) {
                res.json({
                    count: 0,
                    rows: []
                });
                return;
            }
            const linestring = Walk.decodePath(req.query.searchPath);
            where.push({ 
                path: {
                    [Op.overlap]: linestring
                }
            });
            where.push(sequelize.fn('ST_Intersects', sequelize.col('path'), linestring));
        }
        else if (req.query.filter == 'hausdorff') {
            if (!req.query.searchPath) {
                res.json({
                    count: 0,
                    rows: []
                });
                return;
            }
            const max_distance = req.query.max_distance || 4000;
            const linestring = Walk.decodePath(req.query.searchPath);
            const extent     = Walk.getPathExtent(req.query.searchPath);
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
    }
    const limit  = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    Walk.findAndCountAll({
        attributes : attributes,
        order  : [order],
        where  : {[Op.and]: where},
        offset : offset,
        limit  : limit,
        include: [{ model: Users }]
    }).then(function (result) {
        let params = null;
        if (result.count > offset + limit) {
            const q = Object.keys(req.query).filter(function (e) { return e != 'offset';}).map( function (e) { return e + '=' + req.query[e]; });
            q.push('offset=' +  (offset + limit));
            params = q.join('&');
        }
        let prev_id, next_id;
        if (req.query.id) {
            models.sequelize.query('SELECT id FROM walks where id > ? order by id limit 1',
                { replacements: [req.query.id], type: models.sequelize.QueryTypes.SELECT }
            ).then(ids => {
                if (ids.length > 0) next_id = ids[0].id;
                return models.sequelize.query('SELECT id FROM walks where id < ? order by id desc limit 1',
                    { replacements: [req.query.id], type: models.sequelize.QueryTypes.SELECT }
                );
            }).then(ids => {
                if (ids.length > 0) prev_id = ids[0].id;
                res.json({
                    count: result.count,
                    params: params,
                    rows:  result.rows.map(function (row) { return row.asObject(true); }),
                    next_id: next_id,
                    prev_id: prev_id
                });
            });
        } else {
            res.json({
                count: result.count,
                params: params,
                rows:  result.rows.map(function (row) { return row.asObject(true); })
            });
        }
    }).catch (function (reason) {
        res.status(500).json({error: reason});
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
