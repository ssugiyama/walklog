import { Sequelize } from 'sequelize'
import { Model, InferAttributes, InferCreationAttributes, CreationOptional, DataTypes } from 'sequelize';
import { decode, encode } from './path-encoder'
import wkx from 'wkx'
import util from 'util';
import moment from 'moment'
import database from './database';
import { CityResult, SearchResult } from '../../types';

const env = process.env.NODE_ENV || 'development';
const config = database[env];

export let sequelize;
if (config.use_env_variable) {
    sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
    sequelize = new Sequelize(config.database, config.username, config.password, config);
}

export const EARTH_RADIUS = 6370986;
export const SRID = process.env.SRID || 4326;
export const SRID_FOR_SIMILAR_SEARCH = Number(process.env.SRID_FOR_SIMILAR_SEARCH)

export class Walk extends Model<InferAttributes<Walk>, InferCreationAttributes<Walk>> {
    declare id: CreationOptional<number>
    declare date: Date
    declare title: string
    declare comment: string
    declare draft: boolean
    declare image: string
    declare length: number
    declare distance: number | null
    declare path: string
    declare uid: string
    declare name: string
    declare created_at: CreationOptional<Date>
    declare updated_at: CreationOptional<Date>

    static getPoint(x: number, y: number): string {
        return util.format('SRID=%d;POINT(%d %d)', SRID, x, y);
    }

    static decodePath(path: string) {
        const json = { type: 'LineString', coordinates: decode(path), crs: { type: 'name', properties: { name: `EPSG:${SRID}` } } };
        return wkx.Geometry.parseGeoJSON(json).toEwkt();
    }

    static getPathExtent(path: string) {
        const points = decode(path);
        return points.reduce((pv, cv) => {
            if (pv.xmax === undefined || pv.xmax < cv[0]) [pv.xmax] = cv;
            if (pv.xmin === undefined || pv.xmin > cv[0]) [pv.xmin] = cv;
            if (pv.ymax === undefined || pv.ymax < cv[1]) [, pv.ymax] = cv;
            if (pv.ymin === undefined || pv.ymin > cv[1]) [, pv.ymin] = cv;
            return pv;
        }, {});
    }

    static getStartPoint(path: string) {
        const points = decode(path);
        return points[0];
    }

    static getEndPoint(path: string) {
        const points = decode(path);
        return points[points.length - 1];
    }

    encodedPath() {
        return encode(this.path.coordinates);
    }

    asObject(includePath): SearchResult {
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
})

export class Area extends Model<InferAttributes<Area>, InferCreationAttributes<Area>> {
    declare jcode: string
    declare the_geom: string
    encodedGeom() {
        return this.the_geom.coordinates.map((polygones) => encode(polygones[0])).join(' ');
    }

    asObject(): CityResult {
        return {
            jcode: this.jcode,
            theGeom: this.encodedGeom(),
        };
    }
}
Area.init({
    jcode: {
        type: DataTypes.INTEGER,
        primaryKey: true,
    },
    the_geom: DataTypes.BLOB,
}, {
    sequelize,
    timestamps: false,
    underscored: true,
});
