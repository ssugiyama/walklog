var express = require('express')
,   url     = require('url')
,   util    = require('util')
,   models  = require('./models')
,   fs      = require('fs')
,   Walk    = models.sequelize.models.walks
,   Area    = models.sequelize.models.areas;

/*
* GET home page.
*/

var api = express.Router();
module.exports = api;

api.get('/version', function(req, res){
    fs.readFile('package.json', function (err, data) {
        var json = JSON.parse(data);
        res.json({
            app_version: json.version,
            app_env: process.env.NODE_ENV,
        });
    });
});


api.get('/search', function(req, res){
    var order_hash = {
        "newest_first"       : "date desc",
        "oldest_first"       : "date",
        "longest_first"      : "length desc",
        "shortest_first"     : "length",
        "easternmost_first"  : "st_xmax(PATH) desc",
        "westernmost_first"  : "st_xmin(PATH)",
        "southernmost_first" : "st_ymin(PATH)",
        "northernmost_first" : "st_ymax(PATH) desc",
        "nearest_first"      : "distance"
    };
    var where, exprs = [], values = [];
    var order = order_hash[req.query.order] || 'date desc';

    var attributes = ['id', 'date', 'title', 'comment', 'path', "length"];

    if (req.query.id) {
        exprs.push('id = ?');
        values.push(req.query.id);
    }
    else if (req.query.date) {
        exprs.push('date = ?');
        values.push(req.query.date);
    }
    else {
        if (req.query.year) {
            exprs.push('extract(year from DATE) = ?');
            values.push(parseInt(req.query.year));
        }
        if (req.query.month) {
            exprs.push('extract(month from DATE) = ?');
            values.push(parseInt(req.query.month));
        }

        if (req.query.filter == 'neighborhood') {
            var latitude  = parseFloat(req.query.latitude);
            var longitude = parseFloat(req.query.longitude);
            var radius    = parseFloat(req.query.radius);
            var dlat      = radius*180/Math.PI/models.EARTH_RADIUS;
            var mlat      = latitude > 0 ? latitude + dlat : latitude - dlat;
            var dlon      = dlat/Math.cos(mlat/180*Math.PI);
            var center    = Walk.getPoint(longitude, latitude);
            var lb        = Walk.getPoint(longitude-dlon, latitude-dlat);
            var rt        = Walk.getPoint(longitude+dlon, latitude+dlat);
            exprs.push('st_makebox2d(?, ?) && path', 'st_distance(path, ?, TRUE) <= ?');
            values.push(lb, rt,  center, radius);
        }
        else if (req.query.filter == 'cities') {
            var cities = req.query.cities.split(/,/).map(function (elm) { return "'" + elm + "'"; }).join(',');
            exprs.push("EXISTS (SELECT * FROM areas WHERE jcode IN (" + cities + ") AND path && the_geom AND ST_Intersects(path, the_geom))");
        }
        else if (req.query.filter == 'crossing') {
            var linestring = Walk.decodePath(req.query.searchPath);
            exprs.push("path && ?", "ST_Intersects(path, ?)");
            values.push(linestring, linestring);
        }
        else if (req.query.filter == 'hausdorff') {
            var max_distance = req.query.max_distance || 4000;
            linestring = Walk.decodePath(req.query.searchPath);
            extent     = Walk.getPathExtent(req.query.searchPath);
            dlat       = max_distance*180/Math.PI/models.EARTH_RADIUS;
            mlat       = Math.max(Math.abs(extent.ymax + dlat), Math.abs(extent.ymin-dlat));
            dlon       = dlat/Math.cos(mlat/180*Math.PI);
            lb         = Walk.getPoint(extent.xmin-dlon, extent.ymin-dlat);
            rt         = Walk.getPoint(extent.xmax+dlon, extent.ymax+dlat);

            attributes.push([util.format("ST_HausdorffDistance(ST_Transform(path, %d), ST_Transform('%s'::Geometry, %d))/1000", models.SRID_FOR_SIMILAR_SEARCH, linestring, models.SRID_FOR_SIMILAR_SEARCH), 'distance']);
            exprs.push('ST_Within(path, ST_SetSRID(ST_MakeBox2d(?, ?), ?))',
                'ST_HausdorffDistance(ST_Transform(path, ?), ST_Transform(?::Geometry, ?)) < ?');
            values.push(lb, rt, models.SRID, models.SRID_FOR_SIMILAR_SEARCH, linestring, models.SRID_FOR_SIMILAR_SEARCH, max_distance);
        }
    }
    where = [exprs.map(function (e) { return '(' + e + ')';}).join(' AND ')].concat(values);
    var limit  = parseInt(req.query.limit) || 20;
    var offset = parseInt(req.query.offset) || 0;
    Walk.findAndCountAll({
        attributes : attributes,
        order  : order,
        where  : where,
        offset : offset,
        limit  : limit
    }).then(function ( result) {
        var params = null;
        if (result.count > offset + limit) {
            var q = Object.keys(req.query).filter(function (e) { return e != 'offset';}).map( function (e) { return e + '=' + req.query[e]; });
            q.push("offset=" +  (offset + limit));
            params = q.join('&');
        }
        res.json({
            count: result.count,
            params: params,
            rows:  result.rows.map(function (row) { return row.asObject(true); })
        });
    });
});

api.get('/cities', function(req, res){
    var jcodes    = req.query.jcodes;
    if (jcodes) {
        var where = { jcode : { $in : jcodes.split(/,/) } };
    }
    else{
        var latitude  = parseFloat(req.query.latitude);
        var longitude = parseFloat(req.query.longitude);
        where = ['ST_Contains(the_geom, ST_SetSRID(ST_Point(?, ?), ?))', longitude, latitude, models.SRID];
    }
    Area.findAll({
        where  : where
    }).then(function (result) {
        res.json(result.map(function (obj) { return obj.asObject(); }));
    });
});

api.post('/save', function(req, res) {
    var walk;
    var saveCallback = function (row) {
        res.json(row.asObject());
    };
    var linestring = req.body.path ? Walk.decodePath(req.body.path) : null;
    var query;
    var values;
    if (req.body.id) {
        if (linestring) {
            query = "UPDATE walks SET date = ?, title = ?, \"comment\" = ?, path = ?, length = ST_LENGTH(?, TRUE)/1000, updated_at = NOW() WHERE id = ? RETURNING *";
            values = [req.body.date, req.body.title, req.body.comment, linestring, linestring, req.body.id];
        }
        else {
            query = "UPDATE walks SET date = ?, title = ?, \"comment\" = ?, updated_at = NOW() WHERE id = ? RETURNING *";
            values = [req.body.date, req.body.title, req.body.comment, req.body.id];
        }
    }
    else {
        query = "INSERT INTO walks (date, title, \"comment\", path, length, created_at, updated_at) VALUES(?, ?, ?, ?, ST_LENGTH(?, TRUE)/1000, NOW(), NOW()) RETURNING *";
        values = [req.body.date, req.body.title, req.body.comment, linestring, linestring];
    }
    models.sequelize.query(query, {model: Walk, replacements: values}).then(function (rows) {
        res.json(rows.map(function (row) { return row.asObject(true); } ));
    });

});

api.get('/destroy/:id', function(req, res) {
    Walk.destroy({where : { id : req.params.id } }).then(function () {
        res.end('');
    });
});
