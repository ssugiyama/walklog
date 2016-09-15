var Sequelize = require('sequelize');
var encoder = require("./path_encoder");
var wkx     = require("wkx");
var util    = require("util");
var moment  = require("moment");

var EARTH_RADIUS = 6370986;
var SRID = 4326;

exports.SRID = SRID;
exports.EARTH_RADIUS = EARTH_RADIUS;
exports.SRID_FOR_SIMILAR_SEARCH = 32662;

var db_url = process.env.WALKLOG_URL || "postgres://postgres@db/postgres";

var sequelize = new Sequelize(db_url, {
    dialect: 'postgres',
    omitNull: true,
    native: false
});

exports.sequelize = sequelize;

sequelize.define('walks', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true
    },
    date:   Sequelize.STRING,
    title: 	Sequelize.STRING,
    comment:	Sequelize.STRING,
    length: {
        type: Sequelize.FLOAT,
    },
    distance: {
        type: Sequelize.FLOAT,
    },
    path: {
        type : Sequelize.TEXT,
    }
}, {
    underscored: true,
    classMethods: {
    	getPoint: function (x, y) {
    	   return util.format('SRID=%d;POINT(%d %d)', SRID, x, y);
    	},
        decodePath: function (path) {
            var json = { type: 'LineString', coordinates: encoder.decode(path), crs:{type:"name",properties:{name: "EPSG:" + SRID }} };
            return wkx.Geometry.parseGeoJSON(json).toEwkt();
        },
    	getPathExtent: function (path) {
    	    var points = encoder.decode(path);
    	    return points.reduce(function (pv, cv) {
    		if (pv.xmax === undefined || pv.xmax < cv[0] ) pv.xmax = cv[0];
    		if (pv.xmin === undefined || pv.xmin > cv[0] ) pv.xmin = cv[0];
    		if (pv.ymax === undefined || pv.ymax < cv[1] ) pv.ymax = cv[1];
    		if (pv.ymin === undefined || pv.ymin > cv[1] ) pv.ymin = cv[1];
    		return pv;
    	    }, {});
    	}
    },
    instanceMethods: {
    	encodedPath: function () {
    	    return encoder.encode(this.path.coordinates);
    	},
    	asObject: function (includePath) {
    	    return {
                id:         this.id,
                date :      this.date ? moment(this.date).format('YYYY-MM-DD') : null,
                title:      this.title,
                comment:        this.comment,
                length :    this.length,
                path :      (includePath && this.path) ? this.encodedPath() : null,
                created_at: this.created_at,
                updated_at: this.updated_at,
                distance:   this.distance
    	    };
    	}
    }
});

sequelize.define('areas', {
    jcode:	{
        type:       Sequelize.INTEGER,
        primaryKey: true
    },
    the_geom:   Sequelize.BLOB
}, {
    timestamps:  false,
    underscored: true,
    instanceMethods: {
    	encodedGeom: function () {
    	    return  this.the_geom.coordinates.map(function (polygones) {
    		return encoder.encode(polygones[0]);
    	    }).join(' ');
    	},
    	asObject: function () {
    	    return {
    		    jcode:     this.jcode,
    		    the_geom : this.encodedGeom()
    	    };
    	}
    }
});
