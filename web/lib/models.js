const Sequelize = require('sequelize');
const encoder = require('./path_encoder');
const wkx     = require('wkx');
const util    = require('util');
const moment  = require('moment');

const EARTH_RADIUS = 6370986;
const SRID = 4326;

exports.SRID = SRID;
exports.EARTH_RADIUS = EARTH_RADIUS;
exports.SRID_FOR_SIMILAR_SEARCH = 32662;

const dbUrl = process.env.DB_URL || 'postgres://postgres@db/postgres';

const sequelize = new Sequelize(dbUrl, {
    dialect: 'postgres',
    omitNull: true,
    native: false,
});

exports.sequelize = sequelize;

const Walks = sequelize.define('walks', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true
    },
    date:   Sequelize.STRING,
    title:      Sequelize.STRING,
    comment:    Sequelize.STRING,
    image: Sequelize.STRING,
    length: {
        type: Sequelize.FLOAT,
    },
    distance: {
        type: Sequelize.VIRTUAL,
    },
    path: {
        type : Sequelize.TEXT,
    },
    uid: {
        type: Sequelize.STRING,
    }
}, {
    underscored: true,
});

Walks.getPoint = function (x, y) {
    return util.format('SRID=%d;POINT(%d %d)', SRID, x, y);
};

Walks.decodePath = function (path) {
    const json = { type: 'LineString', coordinates: encoder.decode(path), crs:{type:'name',properties:{name: 'EPSG:' + SRID }} };
    return wkx.Geometry.parseGeoJSON(json).toEwkt();
};

Walks.getPathExtent =  function (path) {
    const points = encoder.decode(path);
    return points.reduce(function (pv, cv) {
        if (pv.xmax === undefined || pv.xmax < cv[0] ) pv.xmax = cv[0];
        if (pv.xmin === undefined || pv.xmin > cv[0] ) pv.xmin = cv[0];
        if (pv.ymax === undefined || pv.ymax < cv[1] ) pv.ymax = cv[1];
        if (pv.ymin === undefined || pv.ymin > cv[1] ) pv.ymin = cv[1];
        return pv;
    }, {});
};

Walks.getStartPoint = function(path) {
    const points = encoder.decode(path);
    return points[0];
};

Walks.getEndPoint = function(path) {
    const points = encoder.decode(path);
    return points[points.length - 1];
};

Walks.prototype.encodedPath =  function () {
    return encoder.encode(this.path.coordinates);
};

Walks.prototype.asObject =  function (includePath) {
    return {
        id:         this.id,
        date :      this.date ? moment(this.date).format('YYYY-MM-DD') : null,
        title:      this.title,
        comment:    this.comment,
        image:      this.image,
        length :    this.length,
        path :      (includePath && this.path) ? this.encodedPath() : null,
        createdAt:  this.created_at,
        updatedAt:  this.updated_at,
        distance:   this.distance,
        uid:        this.uid,
    };
};

const Areas = sequelize.define('areas', {
    jcode:      {
        type:       Sequelize.INTEGER,
        primaryKey: true
    },
    the_geom:   Sequelize.BLOB
}, {
    timestamps:  false,
    underscored: true,
});

Areas.prototype.encodedGeom = function () {
    return  this.the_geom.coordinates.map(function (polygones) {
        return encoder.encode(polygones[0]);
    }).join(' ');
};

Areas.prototype.asObject = function () {
    return {
        jcode:   this.jcode,
        theGeom: this.encodedGeom()
    };
};