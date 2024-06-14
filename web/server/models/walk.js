const {
    Model,
} = require('sequelize');
const wkx = require('wkx');
const util = require('util');
const moment = require('moment');
const encoder = require('../path_encoder');

const EARTH_RADIUS = 6370986;
const SRID = 4326;

module.exports = (sequelize, DataTypes) => {
    class Walk extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate() {
            // define association here
        }

        static getPoint(x, y) {
            return util.format('SRID=%d;POINT(%d %d)', SRID, x, y);
        }

        static decodePath(path) {
            const json = { type: 'LineString', coordinates: encoder.decode(path), crs: { type: 'name', properties: { name: `EPSG:${SRID}` } } };
            return wkx.Geometry.parseGeoJSON(json).toEwkt();
        }

        static getPathExtent(path) {
            const points = encoder.decode(path);
            return points.reduce((pv, cv) => {
                if (pv.xmax === undefined || pv.xmax < cv[0]) [pv.xmax] = cv;
                if (pv.xmin === undefined || pv.xmin > cv[0]) [pv.xmin] = cv;
                if (pv.ymax === undefined || pv.ymax < cv[1]) [, pv.ymax] = cv;
                if (pv.ymin === undefined || pv.ymin > cv[1]) [, pv.ymin] = cv;
                return pv;
            }, {});
        }

        static getStartPoint(path) {
            const points = encoder.decode(path);
            return points[0];
        }

        static getEndPoint(path) {
            const points = encoder.decode(path);
            return points[points.length - 1];
        }

        encodedPath() {
            return encoder.encode(this.path.coordinates);
        }

        asObject(includePath) {
            return {
                id: this.id,
                date: this.date ? moment(this.date).format('YYYY-MM-DD') : null,
                title: this.title,
                comment: this.comment,
                draft: this.draft,
                image: this.image,
                length: this.length,
                path: (includePath && this.path) ? this.encodedPath() : null,
                createdAt: this.created_at,
                updatedAt: this.updated_at,
                distance: this.distance,
                uid: this.uid,
            };
        }
    }
    Walk.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
        },
        date: DataTypes.DATEONLY,
        title: DataTypes.STRING,
        comment: DataTypes.STRING,
        draft: DataTypes.BOOLEAN,
        image: DataTypes.STRING,
        length: DataTypes.FLOAT,
        distance: DataTypes.VIRTUAL,
        path: DataTypes.TEXT,
        uid: DataTypes.STRING,
    }, {
        sequelize,
        modelName: 'Walk',
        underscored: true,
    });
    Walk.SRID = SRID;
    Walk.EARTH_RADIUS = EARTH_RADIUS;
    Walk.SRID_FOR_SIMILAR_SEARCH = 32662;
    return Walk;
};
